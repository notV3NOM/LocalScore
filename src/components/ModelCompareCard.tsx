import Card from "@/components/Card";
import AcceleratorMetricsChart from "@/components/charts/AcceleratorMetrics";
import MetricSelector from "@/components/MetricSelector";

import { OFFICIAL_MODELS } from "@/lib/config";
import {
  Accelerator,
  MetricSortDirection,
  Model,
  PerformanceMetricKey,
  PerformanceScore,
  UniqueModel,
} from "@/lib/types";

import React, { useState } from "react";
import Select, { MultiValue } from "react-select";

interface ModelSelectProps {
  models: Model[];
  onChange: (selectedModels: Model[]) => void;
  defaultValue?: UniqueModel[];
}

interface SelectOption {
  value: string;
  label: string;
  model: Model;
}

const ModelSelect: React.FC<ModelSelectProps> = ({
  models,
  onChange,
  defaultValue = [],
}) => {
  const findMatchingModel = (uniqueModel: UniqueModel): Model | undefined => {
    return models.find(
      (model) =>
        model.name === uniqueModel.name && model.quant === uniqueModel.quant
    );
  };

  const options: SelectOption[] = models.map((model) => ({
    value: model.id,
    label: `${model.name} - ${model.quant}`,
    model: model,
  }));

  const defaultOptions: SelectOption[] = defaultValue
    .map((uniqueModel) => {
      const matchedModel = findMatchingModel(uniqueModel);
      if (!matchedModel) return null;

      return {
        value: matchedModel.id,
        label: `${matchedModel.name} ${matchedModel.quant}`,
        model: matchedModel,
      };
    })
    .filter((option): option is SelectOption => option !== null);

  const handleChange = (selectedOptions: MultiValue<SelectOption>) => {
    const selected = selectedOptions.map((option) => option.model);
    onChange(selected);
  };

  const customStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: "40px",
      border: "none",
      padding: "8px 4px",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? "#007bff" : "white",
      "&:hover": {
        backgroundColor: "#f8f9fa",
      },
    }),
  };

  return (
    <Select
      isMulti
      options={options}
      defaultValue={defaultOptions}
      onChange={handleChange}
      className="model-select"
      placeholder="Select models..."
      classNamePrefix="select"
      styles={customStyles}
    />
  );
};

const ModelCompareCard = ({
  results,
  accelerator,
}: {
  results: PerformanceScore[] | null;
  accelerator: Accelerator;
}) => {
  const [selectedKey, setSelectedKey] =
    useState<PerformanceMetricKey>("avg_gen_tps");
  const [selectedModels, setSelectedModels] =
    useState<UniqueModel[]>(OFFICIAL_MODELS);

  if (!results) {
    return <div>Accelerator not found</div>;
  }

  const selectedResults =
    selectedModels.length > 0
      ? results.filter((result) =>
          selectedModels.some(
            (model) =>
              model.name === result.model.name &&
              model.quant === result.model.quant
          )
        )
      : results.filter((result) =>
          OFFICIAL_MODELS.some(
            (model) =>
              model.name === result.model.name &&
              model.quant === result.model.quant
          )
        );
  const models: Model[] = results.map((result) => result.model);

  return (
    <>
      <Card>
        <div className="flex flex-col gap-2 pb-4">
          <p className="font-bold text-lg">Compare Models</p>
          <ModelSelect
            models={models}
            onChange={setSelectedModels}
            defaultValue={selectedModels}
          />
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-col items-center">
            <h2 className="text-center font-medium text-lg">
              {accelerator.name} - {accelerator.memory_gb}GB
            </h2>
          </div>
          <AcceleratorMetricsChart
            data={selectedResults}
            metricKey={selectedKey}
            acceleratorName={accelerator.name}
            sortDirection={MetricSortDirection[selectedKey]}
            xAxisLabel="none"
          />
          <div className="flex items-center max-w-64 w-full">
            <MetricSelector
              selectedKey={selectedKey}
              onChange={setSelectedKey}
            />
          </div>
        </div>
      </Card>
    </>
  );
};

export default ModelCompareCard;
