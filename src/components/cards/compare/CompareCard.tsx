import React, { ReactNode } from "react";
import MetricSelector from "@/components/display/MetricSelector";
import { PerformanceMetricKey } from "@/lib/types";
import {
  CompareCardContainer,
  CompareCardSection,
  CompareChartContainer,
  CompareSectionTitle,
} from "./CompareCardComponents";

interface CompareCardProps {
  headerText: string;
  itemCount: number;
  itemsLabel: string;
  selectorTitle: string;
  selectedKey: PerformanceMetricKey;
  setSelectedKey: (key: PerformanceMetricKey) => void;
  titleContent: ReactNode;
  selectorComponent: ReactNode;
  chartComponent: ReactNode;
}

function CompareCard({
  headerText,
  itemCount,
  itemsLabel,
  selectorTitle,
  selectedKey,
  setSelectedKey,
  titleContent,
  selectorComponent,
  chartComponent,
}: CompareCardProps) {
  return (
    <CompareCardContainer
      headerText={headerText}
      headerRightContent={
        <p className="sm:text-base text-sm">
          {itemCount} {itemsLabel} tested
        </p>
      }
    >
      <CompareCardSection>
        <CompareSectionTitle
          title={selectorTitle}
          className="sm:text-base text-sm"
        />
        {selectorComponent}
      </CompareCardSection>

      <div className="flex flex-col items-center justify-center">
        <CompareCardSection className="items-center gap-2">
          {titleContent}
          <div className="flex items-center max-w-64 w-full">
            <MetricSelector
              selectedKey={selectedKey}
              onChange={setSelectedKey}
            />
          </div>
        </CompareCardSection>

        <CompareChartContainer>{chartComponent}</CompareChartContainer>
      </div>
    </CompareCardContainer>
  );
}

export default CompareCard;
