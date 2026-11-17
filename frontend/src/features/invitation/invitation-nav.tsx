'use client';
import {useEffect,useState,type RefObject} from 'react';

interface NavTarget {
  id: string;
  label: string;
  selector: string;
}

const TARGETS: NavTarget[] = [
  { id: 'inv-events', label: 'Buổi tiệc & RSVP', selector: '#inv-events' },
  { id: 'inv-calendar', label: 'Lịch hẹn', selector: '#inv-calendar .wedding-month-calendar' },
  { id: 'inv-story', label: 'Câu chuyện', selector: '#inv-story' },
  { id: 'inv-sections', label: 'Nghi lễ & Lịch trình', selector: '#inv-sections .content-section' },
  { id: 'inv-album', label: 'Album ảnh', selector: '#inv-album .wedding-album' },
  { id: 'inv-gift', label: 'Quà mừng', selector: '#inv-gift .gift-box' },
  { id: 'inv-wishes', label: 'Sổ lời chúc', selector: '#inv-wishes .wish-book' },
];

/**
 * Thanh điều hướng nhảy nhanh giữa các mục trên thiệp cưới.
 * Tự động nhận diện mục nào thực sự có nội dung trên trang để không bao giờ hiện liên kết rỗng.
 */
export function InvitationQuickNav({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const [available, setAvailable] = useState<NavTarget[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function scan() {
      if (!root) return;
      const found = TARGETS.filter(item => root.querySelector(item.selector) !== null);
      setAvailable(prev =>
        prev.map(x => x.id).join(',') === found.map(x => x.id).join(',') ? prev : found
      );
    }

    scan();
    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => scan())
        : null;
    observer?.observe(root, { childList: true, subtree: true });
    return () => observer?.disconnect();
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || available.length < 2 || typeof IntersectionObserver === 'undefined') return;
    const elements = available
      .map(item => root.querySelector<HTMLElement>(`#${item.id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (!elements.length) return;

    const io = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: 0.05 }
    );
    for (const el of elements) io.observe(el);
    return () => io.disconnect();
  }, [available, rootRef]);

  if (available.length < 2) return null;

  function jump(id: string) {
    const root = rootRef.current;
    const target = root?.querySelector<HTMLElement>(`#${id}`) ?? document.getElementById(id);
    if (!target) return;
    setActiveId(id);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <nav className="invitation-quick-nav" aria-label="Điều hướng nhanh các mục trên thiệp">
      <div className="invitation-quick-nav-track">
        {available.map(item => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`quick-nav-pill${activeId === item.id ? ' is-active' : ''}`}
            aria-current={activeId === item.id ? 'location' : undefined}
            onClick={event => {
              event.preventDefault();
              jump(item.id);
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
