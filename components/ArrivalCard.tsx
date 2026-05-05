import { ArrivalGroup } from "@/types/subway";
import { getLineColor, getLineNumberText } from "@/utils/subwayColors";

interface ArrivalCardProps {
  group: ArrivalGroup;
}

export default function ArrivalCard({ group }: ArrivalCardProps) {
  const lineColor = getLineColor(group.lineName);
  const lineNumberText = getLineNumberText(group.lineName);

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-surface-container-high shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
      <div className="p-sm border-b border-surface-container-high bg-surface-container-low flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full ${lineColor} flex items-center justify-center text-white text-xs font-bold`}
          >
            {lineNumberText}
          </span>
          <span className="font-body-md text-body-md font-semibold text-on-surface">
            {group.lineName}
          </span>
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {group.destination}
        </span>
      </div>
      <div className="p-sm flex flex-col gap-xs">
        {group.arrivals.map((arrival) => (
          <div
            key={arrival.id}
            className="flex items-center justify-between p-2 rounded hover:bg-surface-container transition-colors"
          >
            <div className="flex flex-col">
              <span
                className={`font-body-lg text-body-lg font-bold ${
                  arrival.isUrgent ? "text-error" : "text-primary"
                }`}
              >
                {arrival.estimatedTimeMsg}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {arrival.currentLocationMsg}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-data-mono text-data-mono text-outline">
                #{arrival.trainNumber}
              </span>
              <button className="bg-primary/20 text-primary px-3 py-1.5 rounded-DEFAULT font-body-sm text-body-sm font-medium hover:bg-primary/30 transition-colors border border-primary/30 cursor-pointer">
                선택
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
