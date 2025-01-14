import Card from "@/components/Card";
import ModelMetricsChart from "@/components/charts/ModelMetrics";
import Carat from "@/components/icons/Carat";
import Leaderboard from "@/components/Leaderboard";
import PageHeader from "@/components/PageHeader";
import Separator from "@/components/Separator";
import {
  getPerformanceScores,
  getTopAcceleratorsByModelVariants,
} from "@/db/queries";
import {
  MetricLabels,
  MetricSortDirection,
  PerformanceMetricKey,
  PerformanceScore,
  sortableResultKeys,
} from "@/lib/types";
import { GetServerSideProps } from "next";
import React from "react";

const Index = ({ result }: { result: PerformanceScore | null }) => {
  const [selectedKey, setSelectedKey] =
    React.useState<PerformanceMetricKey>("avg_gen_tps");

  if (!result) {
    return <div>Model not found</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader text={result.model.name} />

      <div className="flex gap-5">
        <div className="flex-1 rounded-md bg-primary-100 p-6">
          <h3 className="text-xl font-semibold mb-3 text-center">Parameters</h3>
          <div className="text-center text-xl">
            {result.model.params >= 1e12
              ? (result.model.params / 1e12).toFixed(2) + "T"
              : result.model.params >= 1e9
              ? (result.model.params / 1e9).toFixed(2) + "B"
              : (result.model.params / 1e6).toFixed(2) + "M"}
          </div>
        </div>
        <div className="flex-1 rounded-md bg-primary-100 p-6">
          <h3 className="text-xl font-semibold mb-3 text-center">
            Quantization
          </h3>
          <div className="text-center text-xl">{result.model.quant}</div>
        </div>
      </div>

      <Separator thickness={2} />

      <Leaderboard data={[result]} />

      <Separator thickness={2} />

      <Card>
        <div className="flex justify-between items-center">
          <p className="font-bold text-lg">Compare</p>
          <div className="relative">
            <select
              value={selectedKey}
              onChange={(e) =>
                setSelectedKey(e.target.value as PerformanceMetricKey)
              }
              className="px-5 py-[10px] text-primary-500 bg-primary-100 border-none appearance-none rounded-md"
            >
              {sortableResultKeys.map((key) => (
                <option key={key} value={key}>
                  {MetricLabels[key]}
                </option>
              ))}
            </select>
            <Carat className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <ModelMetricsChart
          data={[result]}
          selectedModel={result.model}
          metricKey={selectedKey}
          sortDirection={MetricSortDirection[selectedKey]}
        />
      </Card>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { name } = context.query;

  console.log(name);

  const modelVariantIds = [name as string];

  const acceleratorIds = await getTopAcceleratorsByModelVariants({
    modelVariantIds,
    numResults: 100,
  });

  const results = await getPerformanceScores(acceleratorIds, modelVariantIds);
  console.log("Added string", results);

  return {
    props: {
      result: results[0] || null,
    },
  };
};

export default Index;
