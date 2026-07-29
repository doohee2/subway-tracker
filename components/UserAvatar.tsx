"use client";

import { useState } from "react";

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}

/**
 * 프로필 이미지 엑박(Broken Image) 완화 및 예외 방어 (Fallback UX) 컴포넌트
 * 
 * 구글 OAuth, 깃허브 등 외부(Cross-Origin) 아바타 또는 이미지 도달 실패(CORS, 단기 네트워크 단절 등) 시
 * 브라우저 기본 엑박("?") 대신 앱 디자인 시스템과 어울리는 유저 기본 아이콘(account_circle)으로
 * 즉시 자연스럽게 렌더링 전환되도록 방어합니다.
 */
export default function UserAvatar({
  src,
  alt = "사용자 프로필",
  size = 36,
  className = "",
}: UserAvatarProps) {
  // onError 상태 핸들러를 통한 엑박 방어벽 장착
  const [imgError, setImgError] = useState(false);

  // 이미지가 없거나 로딩 중 오류(onError)가 발생한 경우 자연스러운 기본 아이콘으로 Fallback
  if (!src || imgError) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 select-none ${className}`}
        style={{ width: size, height: size }}
        title={alt}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: `${Math.floor(size * 0.72)}px`, fontVariationSettings: "'FILL' 1" }}
        >
          account_circle
        </span>
      </div>
    );
  }

  // 외부(Cross-Origin) 또는 내부 이미지 렌더링
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* 
        외부 도메인 이미지가 Next.js domains 설정 없이 유입될 수 있는 경우를 대비해 
        일반 <img> 태그 또는 unoptimized 속성으로 렌더링하며 onError 방어선 장착 
      */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
