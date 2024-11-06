import ModelMetricsChart from "@/components/charts/ModelMetrics";
import { useRouter } from "next/router";
import React from "react";
import useSWR from "swr";

const fetcher = async (
  url: string,
  data: { model: string; quantization: string }
) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  return response.json();
};

const keys = [
  "avgPromptTokensPerSecond",
  "avgGeneratedTokensPerSecond",
  "avgPromptTokensPerSecondPerWatt",
  "avgGeneratedTokensPerSecondPerWatt",
  "avgTimeToFirstTokenMs",
  "avgTime",
  "avgPower",
];

const sortDirection = {
  avgPromptTokensPerSecond: "desc",
  avgGeneratedTokensPerSecond: "desc",
  avgPromptTokensPerSecondPerWatt: "desc",
  avgGeneratedTokensPerSecondPerWatt: "desc",
  avgTimeToFirstTokenMs: "asc",
  avgTime: "asc",
  avgPower: "desc",
};

const ModelPage = () => {
  const router = useRouter();
  const { name, quant } = router.query;
  const [selectedKey, setSelectedKey] = React.useState(keys[0]);

  // Only make the request when both name and quant are available
  const { data, error, isLoading } = useSWR(
    name && quant
      ? [
          "/api/getModel",
          { model: name as string, quantization: quant as string },
        ]
      : null,
    ([url, payload]) => fetcher(url, payload)
  );

  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>No data available</div>;

  console.log(data);

  return (
    <div className="">
      <h1>
        {name}: {quant}
      </h1>
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
      <div className="flex gap-8 pt-12">
        <div className="w-full max-w-[800px]">
          <h4>Best Performing Accelerators</h4>
          <ModelMetricsChart
            data={data}
            metricKey={"performanceGeometricMean"}
          />
        </div>
        <div className="w-full max-w-[800px]">
          <h4>Most Efficient Accelerators</h4>
          <ModelMetricsChart
            data={data}
            metricKey={"efficiencyGeometricMean"}
          />
        </div>
      </div>
      <div className="w-full max-w-[800px]">
        <h4>Compare</h4>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
        >
          {keys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <ModelMetricsChart
          data={data}
          metricKey={selectedKey}
          sortDirection={sortDirection[selectedKey]}
        />
      </div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default ModelPage;
