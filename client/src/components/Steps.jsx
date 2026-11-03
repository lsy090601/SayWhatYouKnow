// 단어 받기부터 피드백까지 도전의 현재 단계와 완료 단계를 표시합니다.

import { Fragment } from 'react';
import Icon from './Icon';

const NAMES = ['단어 받기', '10분 학습', '설명하기', 'AI 피드백'];

export default function Steps({ current }) {
  return (
    <div className="steps" aria-label={`진행 단계 ${current + 1} / ${NAMES.length}`}>
      {NAMES.map((name, i) => {
        const state = i < current ? 'done' : i === current ? 'cur' : '';
        return (
          <Fragment key={name}>
            <div className={`step ${state}`}>
              <span className="step-dot">{i < current ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
              <span className="step-name">{name}</span>
            </div>
            {i < NAMES.length - 1 && <span className={`step-line${i < current ? ' done' : ''}`} />}
          </Fragment>
        );
      })}
    </div>
  );
}
