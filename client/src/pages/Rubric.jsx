// AI가 설명을 평가할 때 사용하는 항목과 배점을 보여줍니다.

import { useEffect, useState } from 'react';
import { api } from '../api';

// 채점 항목, 설명, 배점을 표로 보여주는 화면입니다.
export default function Rubric() {
  // DB에 등록된 채점 항목과 오류 메시지
  const [criteria, setCriteria] = useState([]);
  const [error, setError] = useState('');
  // 처음 한 번 채점 항목을 불러옵니다.
  useEffect(() => { api('/criteria').then((d) => setCriteria(d.criteria)).catch((e) => setError(e.message)); }, []);
  return (
    <>
      <section className="page-head left">
        <h2 className="h-page">채점 기준</h2>
        <p className="sub">AI는 네 가지 항목으로 설명을 평가해요. 빠진 개념은 정답 대신 힌트로 알려 드려요.</p>
      </section>
      {error && <p className="demo-notice" role="alert">{error}</p>}
      <div className="panel">
        <div className="rubric-table">
          {/* 항목마다 이름, 설명, 배점을 한 줄로 표시합니다. */}
          {criteria.map((r) => (
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
