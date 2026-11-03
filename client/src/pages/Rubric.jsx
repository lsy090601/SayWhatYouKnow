// AI가 설명을 평가할 때 사용하는 항목과 배점을 보여줍니다.

import { RUBRIC } from '../data/mock';

export default function Rubric() {
  return (
    <>
      <section className="page-head left">
        <h2 className="h-page">채점 기준</h2>
        <p className="sub">AI는 네 가지 항목으로 설명을 평가해요. 빠진 개념은 정답 대신 힌트로 알려 드려요.</p>
      </section>
      <div className="panel">
        <div className="rubric-table">
          {RUBRIC.map((r) => (
            <div key={r.key} className="rubric-row">
              <div><b>{r.name}</b><p>{r.desc}</p></div>
              <span className="rubric-pt">{r.max}점</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
