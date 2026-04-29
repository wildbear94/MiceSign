import { useTranslation } from 'react-i18next';

/**
 * Phase 34 — submit 시점 박제된 기안자 snapshot.
 * formData JSON 의 `drafterSnapshot` 키에 저장된다 (D-C1).
 */
export type DrafterSnapshot = {
  departmentName: string;
  positionName: string | null;
  drafterName: string;
  /** ISO 8601 — LocalDateTime serialized (e.g. "2026-04-29T10:30:00") */
  draftedAt: string;
};

/**
 * Phase 34 — DRAFT 모드 또는 legacy fallback 에 사용되는 라이브 기안자 정보.
 * UserProfile (D-F1) 또는 DocumentDetailResponse 의 flat fields (D-G1) 에서 추출.
 */
export type DrafterLive = {
  drafterName: string;
  departmentName: string;
  positionName: string | null;
};

/**
 * Phase 34 — DrafterInfoHeader props (discriminated union).
 *
 * - `mode='draft'` → `live` 만 사용. 기안일은 placeholder ("—").
 * - `mode='submitted'` + `snapshot !== null` → snapshot 4 필드 표시.
 * - `mode='submitted'` + `snapshot === null` → legacy fallback (live + submittedAt + (현재 정보) 배지).
 */
export type DrafterInfoHeaderProps =
  | { mode: 'draft'; live: DrafterLive }
  | {
      mode: 'submitted';
      snapshot: DrafterSnapshot | null;
      live: DrafterLive;
      submittedAt: string;
    };

/**
 * UI-SPEC §"Date Format Contract" — `toLocaleDateString('ko-KR', { y, m:'2-digit', d:'2-digit' })`.
 * `DocumentDetailPage.tsx` L127~131 의 SoT 에서 hour/minute 만 제거.
 */
function formatDraftedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function DrafterInfoHeader(props: DrafterInfoHeaderProps) {
  const { t } = useTranslation('document');

  // Resolve display values per UI-SPEC §"Props selection rule".
  const { departmentName, positionName, drafterName, dateText, showLegacyBadge } =
    props.mode === 'draft'
      ? {
          departmentName: props.live.departmentName,
          positionName: props.live.positionName,
          drafterName: props.live.drafterName,
          dateText: t('drafterInfo.draftedAtPlaceholder'),
          showLegacyBadge: false,
        }
      : props.snapshot !== null
        ? {
            departmentName: props.snapshot.departmentName,
            positionName: props.snapshot.positionName,
            drafterName: props.snapshot.drafterName,
            dateText: formatDraftedDate(props.snapshot.draftedAt),
            showLegacyBadge: false,
          }
        : {
            departmentName: props.live.departmentName,
            positionName: props.live.positionName,
            drafterName: props.live.drafterName,
            dateText: formatDraftedDate(props.submittedAt),
            showLegacyBadge: true,
          };

  return (
    <dl
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3"
      aria-label={t('drafterInfo.headerAriaLabel')}
    >
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
          {t('drafterInfo.departmentLabel')}
        </dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {departmentName}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
          {t('drafterInfo.positionLabel')}
        </dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {positionName ?? t('drafterInfo.emptyPosition')}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
          {t('drafterInfo.drafterLabel')}
        </dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {drafterName}
          {showLegacyBadge && (
            <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">
              {t('drafterInfo.currentInfoBadge')}
            </span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
          {t('drafterInfo.draftedAtLabel')}
        </dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {dateText}
        </dd>
      </div>
    </dl>
  );
}
