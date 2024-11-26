import Card from "@/components/Card";
import ModelMetricsChart from "@/components/charts/ModelMetrics";
import { postFetcher } from "@/lib/swr";
import {
  PerformanceScoresSchema,
  sortableResultKeys,
  PerformanceMetricKey,
  MetricLabels,
  MetricSortDirection,
} from "@/lib/types";
import { useRouter } from "next/router";
import React from "react";
import useSWR from "swr";

export const ModelPage = () => {
  const router = useRouter();
  const { name, quant } = router.query;
  const [selectedKey, setSelectedKey] =
    React.useState<PerformanceMetricKey>("avg_gen_tps");

  const model = { name: name as string, quant: quant as string };

  const { data, error, isLoading } = useSWR(
    name && quant
      ? [
          "/api/getPerformanceScores",
          {
            models: [
              {
                name: model.name,
                quantization: model.quant,
              },
            ],
          },
        ]
      : null,
    ([url, payload]) => postFetcher(url, payload)
  );

  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;
  const parsed = PerformanceScoresSchema.safeParse(data);
  if (!data || !parsed.success)
    return <div>{JSON.stringify(parsed.error)}</div>;

  return (
    <div className="space-y-2">
      <p className="font-semibold text-xl">
        {name}: {quant}
      </p>
      <Card className="w-full">
        <p className="font-bold text-lg">Best Performing Accelerators</p>
        <ModelMetricsChart
          data={data}
          selectedModel={model}
          metricKey={"performance_score"}
        />
      </Card>
      <Card className="w-full">
        <p className="font-bold text-lg">Most Efficient Accelerators</p>
        <ModelMetricsChart
          data={data}
          selectedModel={model}
          metricKey={"efficiency_score"}
        />
      </Card>
      <Card>
        <div className="flex justify-between items-center">
          <p className="font-bold text-lg">Compare</p>
          <div className="relative">
            <select
              value={selectedKey}
              onChange={(e) =>
                setSelectedKey(e.target.value as PerformanceMetricKey)
              }
              className="px-5 py-2 text-primary-500 bg-primary-100 border-none appearance-none rounded-md"
            >
              {sortableResultKeys.map((key) => (
                <option key={key} value={key}>
                  {MetricLabels[key]}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#582acb"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        <ModelMetricsChart
          data={data}
          selectedModel={model}
          metricKey={selectedKey}
          sortDirection={MetricSortDirection[selectedKey]}
        />
      </Card>
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
    </div>
  );
};

export default ModelPage;
