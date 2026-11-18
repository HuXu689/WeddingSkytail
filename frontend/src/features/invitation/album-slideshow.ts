'use client';
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import {albumThumbUrl,imageIndex,secondaryImages} from './album-window';

export interface SlideStageState {
  active: number;
  prev: number | null;
  direction: 1 | -1;
  seq: number;
  freshJump: boolean;
  sidePrev: number[];
}

export interface LightboxStageState {
  active: number;
  prev: number | null;
  direction: 1 | -1;
  seq: number;
}

const STAGE_SETTLE_MS = 1220;
const LIGHTBOX_SETTLE_MS = 580;

/** Chọn chiều trượt ngắn nhất trên vòng tròn album để chuyển cảnh tự nhiên. */
export function shortestDirection(from: number, to: number, length: number): 1 | -1 {
  if (length <= 1 || from === to) return 1;
  const forward = (to - from + length) % length;
  const backward = (from - to + length) % length;
  return forward <= backward ? 1 : -1;
}

/**
 * Tập hợp tối đa 4 lớp ảnh duy nhất (sắp xếp tăng dần để React không đảo thứ tự DOM):
 * gồm ảnh đang chiếu, ảnh vừa rời đi (nếu đang hòa hình), và 2 ảnh kề cận đã giải mã sẵn.
 */
export function computeStageLayers(selected: number, prev: number | null, length: number): number[] {
  if (length <= 0) return [];
  const clean = imageIndex(selected, length);
  if (length === 1) return [clean];
  const set = new Set<number>([
    clean,
    imageIndex(clean + 1, length),
    imageIndex(clean - 1, length),
  ]);
  if (prev !== null && prev >= 0 && prev < length) {
    set.add(prev);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Hàm chuyển trạng thái đồng bộ tức thì ngay trong cùng một nhịp render (zero-tearing):
 * giữ nguyên ảnh cũ ở lớp nền trong lúc ảnh mới lướt nhẹ lên trên, tuyệt đối không chớp tối.
 */
export function transitionSlideState(
  current: SlideStageState,
  nextIndex: number,
  length: number,
  explicitDir?: 1 | -1
): SlideStageState {
  if (length <= 0) return current;
  const cleanCur = imageIndex(current.active, length);
  const cleanNext = imageIndex(nextIndex, length);
  if (cleanNext === cleanCur || length < 2) {
    return current.active === cleanNext ? current : { ...current, active: cleanNext };
  }
  const direction = explicitDir ?? shortestDirection(cleanCur, cleanNext, length);
  const nextNeighbor = imageIndex(cleanCur + 1, length);
  const prevNeighbor = imageIndex(cleanCur - 1, length);
  const wasPreMountedNeighbor =
    length === 2
      ? direction === 1 && cleanNext === nextNeighbor
      : (direction === 1 && cleanNext === nextNeighbor) ||
        (direction === -1 && cleanNext === prevNeighbor);

  return {
    active: cleanNext,
    prev: cleanCur,
    direction,
    seq: current.seq + 1,
    freshJump: !wasPreMountedNeighbor,
    sidePrev: secondaryImages(cleanCur, length),
  };
}

export function createInitialSlideState(initial = 0): SlideStageState {
  return {
    active: initial,
    prev: null,
    direction: 1,
    seq: 0,
    freshJump: false,
    sidePrev: [],
  };
}

/**
 * Bộ điều phối trình chiếu tự động & chuyển cảnh lụa mượt cho Album yêu thương:
 * - Đồng bộ lớp ảnh trước/sau ngay lập tức trong state (không bao giờ trễ 1 frame).
 * - Giải mã trước (preload + decode) cả ảnh gốc lẫn ảnh thu nhỏ kế cận để đạt chuẩn 60fps.
 * - Thanh tiến trình vàng ánh kim tạm dừng êm tại chỗ khi rê chuột/chạm xem và tiếp tục mượt mà.
 */
export function useAlbumSlideshow(
  urls: string[],
  running: boolean,
  intervalMs: number,
  progressBarRef: RefObject<HTMLSpanElement | null>,
  onAutoAdvance?: () => void
) {
  const [stage, setStage] = useState<SlideStageState>(() => createInitialSlideState(0));
  const autoCbRef = useRef(onAutoAdvance);
  autoCbRef.current = onAutoAdvance;
  const accumulatedRef = useRef(0);
  const lastActiveRef = useRef(0);

  const selected = imageIndex(stage.active, urls.length);

  const goTo = useCallback(
    (targetIndex: number, explicitDir?: 1 | -1) => {
      setStage(cur => transitionSlideState(cur, targetIndex, urls.length, explicitDir));
    },
    [urls.length]
  );

  const step = useCallback(
    (delta: number) => {
      const dir: 1 | -1 = delta < 0 ? -1 : 1;
      setStage(cur => {
        const base = imageIndex(cur.active, urls.length);
        return transitionSlideState(cur, base + delta, urls.length, dir);
      });
    },
    [urls.length]
  );

  // Khi đổi sang ảnh khác, đặt lại tiến trình chu kỳ mới một cách trơn tru
  useEffect(() => {
    if (lastActiveRef.current !== selected) {
      lastActiveRef.current = selected;
      accumulatedRef.current = 0;
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = 'scaleX(0)';
      }
    }
  }, [selected, progressBarRef]);

  // Thu dọn lớp ảnh nền sau khi hiệu ứng hòa hình đã hoàn tất hoàn toàn
  useEffect(() => {
    if (stage.prev === null && stage.sidePrev.length === 0) return;
    const settleSeq = stage.seq;
    const timer = window.setTimeout(() => {
      setStage(cur =>
        cur.seq === settleSeq ? { ...cur, prev: null, freshJump: false, sidePrev: [] } : cur
      );
    }, STAGE_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [stage.prev, stage.sidePrev.length, stage.seq]);

  // Tải trước & giải mã (GPU bitmap decode) các ảnh chính và ảnh phụ sắp xuất hiện
  useEffect(() => {
    if (typeof window === 'undefined' || urls.length < 2) return;
    const fullTargets = [
      urls[imageIndex(selected + 1, urls.length)],
      urls[imageIndex(selected + 2, urls.length)],
      urls[imageIndex(selected - 1, urls.length)],
    ];
    const thumbTargets: string[] = [];
    for (let offset = 1; offset <= Math.min(6, urls.length - 1); offset++) {
      const raw = urls[imageIndex(selected + offset, urls.length)];
      if (raw) thumbTargets.push(albumThumbUrl(raw));
    }
    for (const src of [...fullTargets, ...thumbTargets]) {
      if (!src) continue;
      const pre = new window.Image();
      pre.decoding = 'async';
      pre.src = src;
      pre.decode?.().catch(() => {});
    }
  }, [urls, selected]);

  // Vòng lặp tiến trình 60fps bằng requestAnimationFrame — giữ nguyên tiến độ khi khách tạm dừng ngắm ảnh
  useEffect(() => {
    if (!running || typeof window === 'undefined' || urls.length < 2) {
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reduced?.matches) {
      if (progressBarRef.current) progressBarRef.current.style.transform = 'scaleX(0)';
      return;
    }

    let rafId = 0;
    let lastTs = 0;
    let inViewport = true;

    const sectionEl = progressBarRef.current?.closest('.wedding-album');
    const io =
      sectionEl && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            entries => {
              if (entries[0]) inViewport = entries[0].isIntersecting;
            },
            { threshold: 0.12 }
          )
        : null;
    if (io && sectionEl) io.observe(sectionEl);

    const tick = (now: number) => {
      if (document.hidden || !inViewport || document.body.style.overflow === 'hidden') {
        lastTs = 0;
        rafId = window.requestAnimationFrame(tick);
        return;
      }
      if (!lastTs) lastTs = now;
      const dt = Math.min(64, now - lastTs);
      lastTs = now;
      accumulatedRef.current += dt;

      const ratio = Math.max(0, Math.min(1, accumulatedRef.current / intervalMs));
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
      }

      if (accumulatedRef.current >= intervalMs) {
        accumulatedRef.current = 0;
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = 'scaleX(0)';
        }
        setStage(cur => {
          const base = imageIndex(cur.active, urls.length);
          return transitionSlideState(cur, base + 1, urls.length, 1);
        });
        autoCbRef.current?.();
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      io?.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [running, intervalMs, urls.length, progressBarRef]);

  return { stage, selected, goTo, step };
}

/**
 * Điều phối chuyển ảnh mượt hai lớp cho hộp thoại Lightbox toàn màn hình.
 */
export function useLightboxStage(urls: string[], initial: number) {
  const [state, setState] = useState<LightboxStageState>(() => ({
    active: imageIndex(initial, urls.length),
    prev: null,
    direction: 1,
    seq: 0,
  }));

  const index = imageIndex(state.active, urls.length);

  const select = useCallback(
    (target: number, explicitDir?: 1 | -1) => {
      setState(cur => {
        const cleanCur = imageIndex(cur.active, urls.length);
        const cleanNext = imageIndex(target, urls.length);
        if (cleanNext === cleanCur || urls.length < 2) {
          return cur.active === cleanNext ? cur : { ...cur, active: cleanNext };
        }
        const direction = explicitDir ?? shortestDirection(cleanCur, cleanNext, urls.length);
        return {
          active: cleanNext,
          prev: cleanCur,
          direction,
          seq: cur.seq + 1,
        };
      });
    },
    [urls.length]
  );

  const step = useCallback(
    (delta: number) => {
      const dir: 1 | -1 = delta < 0 ? -1 : 1;
      setState(cur => {
        const base = imageIndex(cur.active, urls.length);
        const cleanNext = imageIndex(base + delta, urls.length);
        if (cleanNext === base || urls.length < 2) return cur;
        return {
          active: cleanNext,
          prev: base,
          direction: dir,
          seq: cur.seq + 1,
        };
      });
    },
    [urls.length]
  );

  useEffect(() => {
    if (state.prev === null) return;
    const settleSeq = state.seq;
    const timer = window.setTimeout(() => {
      setState(cur => (cur.seq === settleSeq ? { ...cur, prev: null } : cur));
    }, LIGHTBOX_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [state.prev, state.seq]);

  useEffect(() => {
    if (typeof window === 'undefined' || urls.length < 2) return;
    for (const offset of [1, -1]) {
      const src = urls[imageIndex(index + offset, urls.length)];
      if (!src) continue;
      const pre = new window.Image();
      pre.decoding = 'async';
      pre.src = src;
      pre.decode?.().catch(() => {});
    }
  }, [urls, index]);

  return { state, index, select, step };
}

/**
 * Tự căn giữa ảnh đang chọn trong dải phim ngang mà không bao giờ làm cuộn dọc trang chính.
 */
export function useFilmstripCenter(
  stripRef: RefObject<HTMLElement | null>,
  activeKey: number
): void {
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || typeof window === 'undefined') return;
    const activeBtn = strip.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeBtn) return;
    const targetLeft = activeBtn.offsetLeft - (strip.clientWidth - activeBtn.clientWidth) / 2;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    strip.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [stripRef, activeKey]);
}
