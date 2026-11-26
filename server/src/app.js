// API 요청을 받아 게스트 세션, 단어 조회, 도전 진행 및 채점 결과를 처리합니다.

import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomBytes, createHash } from "node:crypto";
import { config } from "./config.js";
import { grade as defaultGrade } from "./grader.js";
import {
  parse,
  newChallenge,
  wordQuery,
  submission,
  credentials,
  HttpError,
} from "./validation.js";
import { hashPassword, verifyPassword } from "./password.js";
// 세션 토큰은 DB에 원문 대신 SHA-256 해시로 저장합니다.
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
// 응답에 공개할 도전 정보만 골라 채점용 참고 설명과 내부 식별 정보를 제외합니다.
const publicChallenge = (c) => ({
  id: c.id,
  field: c.field,
  difficulty: c.difficulty,
  word: { id: c.word_id, word: c.word, en: c.en },
  explanation: c.explanation || "",
  links: c.links.map((l) => ({ url: l.url, host: new URL(l.url).hostname })),
  feedback: c.feedback || null,
  status: c.status,
  startedAt: c.started_at || null,
  completedAt: c.completed_at || null,
});
// Express 앱을 만듭니다. 테스트에서 저장소와 채점기를 교체할 수 있도록 주입받습니다.
export function createApp({ repo, grade = defaultGrade, rateLimits = true }) {
  const app = express();
  // 새 세션 토큰을 만들어 쿠키로 보내고 토큰 원문을 반환합니다.
  const issueToken = (res) => {
    const token = randomBytes(32).toString("hex");
    res.cookie("swk_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: config.production,
      maxAge: 31536000000,
      path: "/api",
    });
    return token;
  };
  // 사용 기술을 알리는 헤더를 제거합니다.
  app.disable("x-powered-by");
  // Vercel에서는 프록시가 전달한 실제 사용자 IP로 요청 횟수를 제한합니다.
  if (process.env.VERCEL) app.set("trust proxy", 1);
  // 보안 관련 HTTP 헤더를 추가합니다.
  app.use(helmet());
  // JSON 본문 크기를 제한합니다.
  app.use(express.json({ limit: "48kb" }));
  // API 응답이 캐시되지 않게 합니다.
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  // 사용자 세션 없이 DB 연결 상태를 확인합니다.
  app.get("/api/health", async (_req, res) => {
    try {
      await repo.health();
      res.json({
        status: "ok",
        database: "connected",
        aiConfigured:
          process.env.AI_PROVIDER === "ollama" ||
          Boolean(process.env.GEMINI_API_KEY),
      });
    } catch {
      res
        .status(503)
        .json({
          status: "unavailable",
          error: "MySQL 연결을 확인하고 npm run db:init을 실행해 주세요.",
        });
    }
  });
  // API 요청을 사용자 측 기준 분당 120회로 제한합니다.
  if (rateLimits)
    app.use(
      "/api",
      rateLimit({
        windowMs: 60000,
        limit: 120,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: { error: "요청이 많아요. 잠시 후 다시 시도해 주세요." },
      }),
    );
  // 이후의 모든 API에 적용되는 출처 검사와 게스트 세션 처리입니다.
  app.use("/api", async (req, res, next) => {
    // 다른 사이트에서 보낸 쓰기 요청을 Origin 헤더로 차단합니다.
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin
    ) {
      const allowed = new Set(
        config.production
          ? [config.origin]
          : [config.origin, "http://localhost:5173", "http://127.0.0.1:5173"],
      );
      if (!allowed.has(req.headers.origin))
        throw new HttpError(403, "허용되지 않은 요청 출처입니다.");
    }
    // 게스트 쿠키가 없거나 형식이 잘못되면 새 토큰을 발급하고 DB에는 해시를 사용합니다.
    let token = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("swk_session="))
      ?.slice(12);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) token = issueToken(res);
    // 토큰 해시로 사용자를 조회하거나 새로 만듭니다.
    req.user = await repo.user(hashToken(token));
    next();
  });
  // 로그인과 회원가입은 비밀번호 추측을 막기 위해 분당 10회로 제한합니다.
  const authLimit = rateLimit({
    windowMs: 60000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "시도가 너무 많아요. 1분 뒤 다시 시도해 주세요." },
  });
  const authLimits = rateLimits ? [authLimit] : [];
  // 현재 로그인한 아이디를 반환합니다. 게스트면 null입니다.
  app.get("/api/me", (req, res) =>
    res.json({ username: req.user.username || null }),
  );
  // 지금 게스트 계정에 아이디와 비밀번호를 붙여 회원으로 전환합니다. 지금까지의 기록이 그대로 남습니다.
  app.post("/api/signup", ...authLimits, async (req, res) => {
    const { username, password } = parse(credentials, req.body);
    if (req.user.username)
      throw new HttpError(
        409,
        "이미 로그인되어 있어요. 로그아웃 후 가입해 주세요.",
      );
    let ok;
    try {
      ok = await repo.register(
        req.user.id,
        username,
        await hashPassword(password),
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY")
        throw new HttpError(409, "이미 사용 중인 아이디예요.");
      throw error;
    }
    if (!ok) throw new HttpError(409, "이미 가입된 계정이에요.");
    res.status(201).json({ username });
  });
  // 아이디와 비밀번호를 확인하고 이 브라우저의 세션을 해당 회원으로 바꿉니다.
  app.post("/api/login", ...authLimits, async (req, res) => {
    const { username, password } = parse(credentials, req.body);
    const account = await repo.account(username);
    if (!account || !(await verifyPassword(password, account.password_hash)))
      throw new HttpError(401, "아이디 또는 비밀번호가 맞지 않아요.");
    // 새 토큰을 발급해 회원에 연결합니다. 회원 한 명당 세션은 하나라서 다른 기기는 로그아웃됩니다.
    await repo.setToken(account.id, hashToken(issueToken(res)));
    res.json({ username: account.username });
  });
  // 로그아웃하면 회원 토큰을 무효화하고 새 게스트로 시작합니다.
  app.post("/api/logout", async (req, res) => {
    if (req.user.username) {
      await repo.setToken(
        req.user.id,
        hashToken(randomBytes(32).toString("hex")),
      );
      issueToken(res);
    }
    res.json({ username: null });
  });
  // 단어 선택 화면에서 고를 수 있는 분야와 난이도 목록을 반환합니다.
  app.get("/api/options", async (_req, res) => res.json(await repo.options()));
  // 채점 항목과 배점을 반환합니다.
  app.get("/api/criteria", async (_req, res) =>
    res.json({
      criteria: (await repo.criteria()).map((c) => ({
        key: c.code,
        name: c.name,
        max: c.max_score,
        desc: c.description,
      })),
    }),
  );
  // 분야와 난이도에 맞는 단어 목록을 반환합니다. DB에 없는 분야·난이도는 거부합니다.
  app.get("/api/words", async (req, res) => {
    const q = parse(wordQuery, req.query);
    const { fields, difficulties } = await repo.options();
    if (!fields.includes(q.field) || !difficulties.includes(q.difficulty))
      throw new HttpError(400, "선택할 수 없는 분야 또는 난이도예요.");
    res.json({ words: await repo.words(q.field, q.difficulty) });
  });
  // 선택한 단어로 새 도전을 만듭니다.
  app.post("/api/challenges", async (req, res) => {
    const { wordId } = parse(newChallenge, req.body);
    if (!(await repo.word(wordId)))
      throw new HttpError(404, "단어를 찾지 못했어요.");
    const id = await repo.create(req.user.id, wordId);
    res.status(201).json(publicChallenge(await repo.get(id, req.user.id)));
  });
  // ID 형식을 검사하고 현재 사용자가 소유한 도전만 가져옵니다.
  const get = async (req) => {
    if (!/^[0-9a-f-]{36}$/.test(req.params.id))
      throw new HttpError(400, "도전 ID가 올바르지 않습니다.");
    const c = await repo.get(req.params.id, req.user.id);
    if (!c) throw new HttpError(404, "도전 기록을 찾지 못했어요.");
    return c;
  };
  // 도전 하나를 조회합니다.
  app.get("/api/challenges/:id", async (req, res) =>
    res.json(publicChallenge(await get(req))),
  );
  // AI 미사용 서약을 확인하고 학습을 시작합니다.
  app.post("/api/challenges/:id/start", async (req, res) => {
    await get(req);
    if (req.body?.pledged !== true)
      throw new HttpError(400, "AI 미사용 서약에 동의해 주세요.");
    await repo.start(req.params.id, req.user.id);
    res.json(publicChallenge(await get(req)));
  });
  // 비용이 드는 채점 요청은 분당 5회로 더 엄격하게 제한합니다.
  const gradingLimit = rateLimit({
    windowMs: 60000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "채점 요청이 많아요. 잠시 후 다시 제출해 주세요." },
  });
  // 설명을 제출해 AI 채점을 받고 결과를 저장합니다.
  app.post(
    "/api/challenges/:id/submit",
    ...(rateLimits ? [gradingLimit] : []),
    async (req, res) => {
      const body = parse(submission, req.body);
      const c = await get(req);
      // 이미 완료된 도전은 다시 채점하지 않고 기존 결과를 반환합니다.
      if (c.status === "completed") return res.json(publicChallenge(c));
      // 서약으로 학습을 시작한 도전만 제출할 수 있습니다.
      if (!c.started_at)
        throw new HttpError(409, "학습 서약 후 시작해 주세요.");
      // 채점권을 확보한 요청만 AI를 호출해 중복 제출을 방지합니다.
      if (!(await repo.claim(c.id, req.user.id)))
        throw new HttpError(
          409,
          "이미 채점 중이에요. 잠시 후 기록을 확인해 주세요.",
        );
      try {
        // DB의 채점 항목과 배점을 기준으로 채점합니다.
        const criteria = await repo.criteria();
        const feedback = await grade({
          ...c,
          explanation: body.explanation,
          criteria,
        });
        await repo.complete(
          c.id,
          req.user.id,
          body.explanation,
          [...new Set(body.links)],
          feedback,
        );
        // 채점 실패 시 공부 중 상태로 되돌려 다시 제출할 수 있게 합니다.
      } catch (error) {
        await repo.release(c.id, req.user.id);
        throw error;
      }
      res.json(publicChallenge(await get(req)));
    },
  );
  // 완료한 도전 목록과 총 횟수, 평균, 최고 점수를 반환합니다.
  app.get("/api/history", async (req, res) => {
    const items = await repo.history(req.user.id);
    const scores = items.map((i) => i.score);
    res.json({
      items,
      stats: {
        total: items.length,
        average: items.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / items.length)
          : 0,
        best: items.length ? Math.max(...scores) : 0,
      },
    });
  });
  // 일치하는 경로가 없는 API 요청은 404로 처리합니다.
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "API 경로를 찾지 못했어요.")),
  );
  // 모든 오류를 JSON 응답으로 변환하는 처리기입니다.
  app.use((error, _req, res, _next) => {
    // DB 연결 관련 오류는 503, 그 외 예상하지 못한 오류는 500으로 처리합니다.
    const status =
      error.status ||
      ([
        "ECONNREFUSED",
        "ER_ACCESS_DENIED_ERROR",
        "ER_BAD_DB_ERROR",
        "ER_NO_SUCH_TABLE",
        "ETIMEDOUT",
      ].includes(error.code)
        ? 503
        : 500);
    // 서버 로그에는 코드나 오류 이름만 남깁니다.
    if (status >= 500) {
      console.error("API error:", error.code || error.name);
      console.error("Error message:", error.message);
    }
    // 내부 오류의 세부 내용은 사용자에게 노출하지 않습니다.
    res
      .status(status)
      .json({
        error:
          status === 503 && !error.status
            ? "MySQL 연결 설정과 데이터베이스 초기화를 확인해 주세요."
            : (error.status && status < 500) || error instanceof HttpError
              ? error.message
              : "서버에서 요청을 처리하지 못했어요.",
      });
  });
  return app;
}
