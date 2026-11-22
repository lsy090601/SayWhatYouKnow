// 텍스트와 브라우저 음성 인식으로 설명을 작성하고 채점을 요청합니다.

import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { post } from "../api";
import Steps from "../components/Steps";
import { useChallenge } from "../ChallengeContext";

// 브라우저별 음성 인식 API를 가져옵니다. 지원하지 않으면 falsy 값입니다.
const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);
// 음성 입력 중 표시할 파형 막대의 높이(px)입니다.
const WAVE = [8, 14, 22, 28, 18, 24, 28, 22, 12, 26, 20, 10, 16, 24, 14, 8];

// 설명을 입력하고 AI 채점을 요청하는 화면입니다.
export default function Explain() {
  const navigate = useNavigate();
  const { challenge, update } = useChallenge();
  // 입력 중인 설명입니다. 이전에 작성한 내용이 있으면 이어서 표시합니다.
  const [text, setText] = useState(challenge.explanation);
  // 음성 입력 진행 여부
  const [listening, setListening] = useState(false);
  // 마이크 오류 메시지
  const [micError, setMicError] = useState("");
  // 채점 요청 진행 여부
  const [submitting, setSubmitting] = useState(false);
  // 채점 요청 오류 메시지
  const [submitError, setSubmitError] = useState("");
  // 음성 입력 경과 시간(초)
  const [seconds, setSeconds] = useState(0);
  // 현재 음성 인식 객체
  const recRef = useRef(null);
  // 음성 입력을 시작하기 전의 텍스트
  const baseRef = useRef("");

  // 음성 입력 중에는 1초마다 경과 시간을 늘립니다.
  useEffect(() => {
    if (!listening) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);

  // 화면을 떠나면 음성 인식을 중지합니다.
  useEffect(() => () => recRef.current?.stop(), []);

  // 선택한 단어가 없으면 단어 선택 화면으로 돌려보냅니다.
  if (!challenge.word) return <Navigate to="/challenge" replace />;

  // 마이크 버튼: 음성 입력을 시작하거나 중지합니다.
  const toggleMic = () => {
    if (!SpeechRecognition) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    // 한국어 연속 인식을 설정하고 중간 결과도 받습니다.
    const rec = new SpeechRecognition();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;
    // 기존 글 뒤에 음성 내용을 이어 붙이기 위해 저장합니다.
    baseRef.current = text ? text.trimEnd() + " " : "";
    // 누적된 인식 결과를 확정 문장과 임시 문장으로 나눠 다시 조합합니다.
    rec.onresult = (e) => {
      let finalText = "",
        interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      // 기존 글 + 확정 문장 + 임시 문장을 입력창에 표시합니다.
      setText(baseRef.current + finalText + interim);
    };
    // 인식이 끝나면 듣는 중 상태를 해제합니다.
    rec.onend = () => setListening(false);
    // 오류 종류에 따라 안내 문구를 다르게 표시합니다.
    rec.onerror = (event) => {
      setListening(false);
      setMicError(
        event.error === "not-allowed"
          ? "마이크 권한이 필요해요. 브라우저 설정을 확인하거나 글로 입력해 주세요."
          : "음성을 인식하지 못했어요. 다시 시도하거나 글로 입력해 주세요.",
      );
    };
    setMicError("");
    // 이미 인식 중이면 start()가 예외를 던질 수 있어 처리합니다.
    try {
      rec.start();
    } catch {
      setMicError("음성 입력을 시작하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    // 시작에 성공한 뒤에만 객체를 저장하고 타이머를 초기화합니다.
    recRef.current = rec;
    setSeconds(0);
    setListening(true);
  };

  // 설명을 제출해 채점 결과를 받고 피드백 화면으로 이동합니다.
  const submit = async () => {
    // 중복 제출을 막습니다.
    if (submitting) return;
    // 제출 전에 음성 인식을 멈추고 현재 글을 저장합니다.
    recRef.current?.stop();
    update({ explanation: text });
    setSubmitting(true);
    setSubmitError("");
    try {
      // 서버에 만든 도전 ID가 없으면 제출할 수 없습니다.
      if (!challenge.id) throw new Error("단어 선택부터 다시 시작해 주세요.");
      const result = await post("/challenges/" + challenge.id + "/submit", {
        explanation: text,
        links: challenge.links.map((link) => link.url),
      });
      // 채점 결과를 도전 상태에 반영합니다.
      update(result);
      navigate("/challenge/feedback");
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  // 경과 시간을 mm:ss 형식으로 변환합니다.
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <>
      {/* 진행 단계 표시 */}
      <Steps current={2} />
      {/* 분야, 단어, 안내 문구 */}
      <section className="page-head">
        <div className="tags center">
          <span className="tag">{challenge.field}</span>
          <span className="tag">{challenge.word.word}</span>
        </div>
        <h2 className="h-page">처음 듣는 친구에게 설명해 보세요</h2>
        <p className="sub">
          어려운 용어보다 쉬운 말과 예시가 좋아요. 직접 쓰거나 마이크로 말할 수
          있어요.
        </p>
      </section>
      {/* 마이크 오류와 제출 오류 안내 */}
      {micError && (
        <p className="demo-notice" role="alert">
          {micError}
        </p>
      )}
      {submitError && (
        <p className="demo-notice" role="alert">
          {submitError}
        </p>
      )}
      {/* 외부 전송 범위 안내 */}
      <p className="sub">
        제출하면 설명 텍스트가 AI 채점을 위해 Google(Gemini)로 전송됩니다. 음성
        원본은 이 서버에 저장하지 않습니다.
      </p>
      {/* 설명 입력 영역 */}
      <div className="panel editor">
        <textarea
          className="editor-text"
          value={text}
          maxLength={10000}
          disabled={submitting}
          onChange={(e) => {
            setText(e.target.value);
            update({ explanation: e.target.value });
          }}
          placeholder={`${challenge.word.word}(이)란…`}
          aria-label="설명 입력"
        />
        {/* 마이크, 글자 수, 제출 버튼 영역 */}
        <div className="editor-foot">
          <div className="rec">
            <button
              className={`mic-btn${listening ? "" : " idle"}`}
              onClick={toggleMic}
              disabled={!SpeechRecognition || submitting}
              aria-pressed={listening}
              aria-label={listening ? "음성 입력 멈추기" : "음성으로 설명하기"}
            >
              <Icon name="mic" size={22} strokeWidth={2.2} />
            </button>
            <div className="col">
              {/* 듣는 중이면 시간과 파형을, 아니면 안내 문구를 표시합니다. */}
              {listening ? (
                <>
                  <span className="rec-t">
                    <span className="rec-dot" />
                    듣고 있어요 · {mm}:{ss}
                  </span>
                  <div className="wave">
                    {WAVE.map((h, i) => (
                      <span
                        key={i}
                        className="wave-bar"
                        style={{ height: h }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <span className="count">
                  {SpeechRecognition
                    ? "마이크를 눌러 말로 설명할 수 있어요"
                    : "이 브라우저는 음성 입력을 지원하지 않아요"}
                </span>
              )}
            </div>
          </div>
          <div className="row gap foot-r">
            <span className="count">{text.length}자</span>
            {/* 서버 검증과 같이 공백 제외 20자 이상이어야 제출할 수 있습니다. */}
            <button
              className="btn btn-primary"
              disabled={submitting || text.trim().length < 20}
              onClick={submit}
            >
              {submitting ? "AI가 설명을 읽고 있어요…" : "제출하고 피드백 받기"}{" "}
              <Icon name="arrow" size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
