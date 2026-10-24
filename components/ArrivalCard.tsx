import { ArrivalGroup } from "@/types/subway";
import { getLineColor, getLineNumberText } from "@/utils/subwayColors";
import Link from "next/link";

interface ArrivalCardProps {
  group: ArrivalGroup;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function ArrivalCard({ group, isExpanded, onToggle }: ArrivalCardProps) {
  const lineColor = getLineColor(group.lineName);
  const lineNumberText = getLineNumberText(group.lineName);
  const directionText = group.directionLabel || (group.updnLine === "0" ? "상행" : "하행");

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-surface-container-high shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
      <div 
        className="p-sm border-b border-surface-container-high bg-surface-container-low flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors gap-2"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <span
            className={`w-6 h-6 rounded-full ${lineColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}
          >
            {lineNumberText}
          </span>
          <span className="font-body-md text-body-md font-bold text-on-surface whitespace-nowrap">
            {group.lineName}
          </span>
          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
            {directionText}
          </span>
          {group.nextStationName && (
            <span className="text-xs text-on-surface-variant whitespace-nowrap flex items-center gap-0.5">
              <span className="text-outline">·</span> 다음: <strong className="font-semibold text-on-surface">{group.nextStationName}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-body-sm text-body-sm text-on-surface-variant max-w-[120px] sm:max-w-[180px] truncate text-right" title={group.destination}>
            {group.destination}
          </span>
          <span className={`material-symbols-outlined transition-transform duration-200 text-on-surface-variant ${isExpanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="p-sm flex flex-col gap-xs">
          {group.arrivals.map((arrival) => (
            <div
              key={arrival.id}
              className="flex items-center justify-between p-2 rounded hover:bg-surface-container transition-colors gap-2"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-on-surface bg-surface-container-high px-1.5 py-0.5 rounded border border-surface-container-highest whitespace-nowrap">
                    {arrival.bstatnNm ? `${arrival.bstatnNm}행` : "행선지"}
                  </span>
                  {arrival.isExpress && (
                    <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {arrival.btrainSttus || "급행"}
                    </span>
                  )}
                  <span
                    className={`font-body-lg text-body-lg font-bold whitespace-nowrap ${
                      arrival.isUrgent ? "text-error" : "text-primary"
                    }`}
                  >
                    {arrival.estimatedTimeMsg}
                  </span>
                  {arrival.calculatedArrivalTime && (
                    <span className="text-xs font-medium text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {arrival.calculatedArrivalTime}
                    </span>
                  )}
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  {arrival.currentLocationMsg}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-data-mono text-data-mono text-outline text-xs">
                  #{arrival.trainNumber}
                </span>
                <Link
                  href={{
                    pathname: `/route/${arrival.trainNumber}`,
                    query: {
                      lineName: group.lineName,
                      destination: arrival.destination || group.destination,
                      currentLocationMsg: arrival.currentLocationMsg,
                      updnLine: arrival.updnLine,
                      bstatnNm: arrival.bstatnNm,
                      subwayId: arrival.subwayId,
                      statnNm: arrival.statnNm,
                      recptnDt: arrival.recptnDt,
                      btrainSttus: arrival.btrainSttus || "일반",
                    }
                  }}
                  className="bg-primary/20 text-primary px-2.5 py-1 rounded font-body-sm text-body-sm font-medium hover:bg-primary/30 transition-colors border border-primary/30 cursor-pointer text-center block whitespace-nowrap"
                >
                  선택
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
