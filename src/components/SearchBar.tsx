import { fetcher } from "@/lib/swr";
import { SearchBarOption, SearchResponse } from "@/lib/types";
import { useRouter } from "next/router";
import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });
import { GroupBase, OptionsOrGroups } from "react-select";
import useSWR from "swr";
import Search from "./icons/Search";

const customStyles = {
  dropdownIndicator: () => ({
    display: "none",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  menu: (base: any) => ({
    ...base,
    marginTop: -4,
    border: "none",
    backgroundColor: "#f2eefb",
    borderRadius: "0 0 4px 4px",
    boxShadow:
      "0 8px 16px -4px rgba(0, 0, 0, 0.1), 4px 0 16px -4px rgba(0, 0, 0, 0.1), -4px 0 16px -4px rgba(0, 0, 0, 0.1)",
  }),
  control: (base: any) => ({
    ...base,
    borderRadius: "0",
    border: "none",
    boxShadow: "none",
    background: "transparent",
    padding: "10px 20px",
  }),
  group: (base: any) => ({
    ...base,
    paddingTop: 8,
    paddingBottom: 8,
  }),
  groupHeading: (base: any) => ({
    ...base,
    color: "#582acb",
    fontWeight: 500,
  }),
  option: (base: any, { isFocused, isSelected }: any) => ({
    ...base,
    backgroundColor: isFocused ? "#e9e6f8" : "transparent",
    color: isSelected ? "#582acb" : "inherit",
    cursor: "pointer",
  }),
};

const getOptionsFromResponse = (
  data: SearchResponse
): OptionsOrGroups<SearchBarOption, GroupBase<SearchBarOption>> => {
  const modelOptions = data.models.map((model) => ({
    value: `${model.name}-${model.quantization}`,
    label: (
      <div className="flex justify-between items-center">
        <p>{model.name}</p>
        <p className=" text-sm">{model.quantization}</p>
      </div>
    ),
    group: "model" as const,
    modelName: model.name,
    quantization: model.quantization,
    variantId: model.variantId,
  }));

  const acceleratorOptions = data.accelerators.map((acc) => ({
    value: acc.name,
    label: (
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <p>{acc.name}</p>
          <p className="font-light text-sm">{acc.memory_gb}GB</p>
        </div>
        <p className="text-sm">{acc.type}</p>
      </div>
    ),
    group: "accelerator" as const,
    acceleratorName: acc.name,
    acceleratorMemory: acc.memory_gb,
    acceleratorId: acc.acceleratorId,
  }));

  return [
    {
      label: "Models",
      options: modelOptions,
    },
    {
      label: "Accelerators",
      options: acceleratorOptions,
    },
  ];
};

export const SearchBar: React.FC<{ className?: string }> = ({ className }) => {
  const router = useRouter();
  const [inputValue, setInputValue] = useState<string>("");
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Use SWR for data fetching
  const { data, isLoading, error } = useSWR(
    `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
    fetcher,
    {
      revalidateOnFocus: false, // Prevent refetch on window focus
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  );

  // Convert the response data to options
  const options: OptionsOrGroups<
    SearchBarOption,
    GroupBase<SearchBarOption>
  > = data ? getOptionsFromResponse(data) : [];

  // Debounce the input
  const debouncedFetch = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
  }, []);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    debouncedFetch(newValue);
  };

  const handleOptionSelect = useCallback(
    (option: SearchBarOption | null) => {
      if (!option) return;

      const path =
        option.group === "model"
          ? `/model/${option.variantId}`
          : `/accelerator/${option.acceleratorId}`;

      router.push(path);
    },
    [router]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (error) {
    console.error("Error fetching options:", error);
  }

  return (
    // @ts-ignore - for some reason the dynamic import is causing a type error
    <Select<SearchBarOption, false, GroupBase<SearchBarOption>>
      cacheOptions
      className={`w-full bg-primary-50 rounded-md ${className}`}
      styles={customStyles}
      onChange={handleOptionSelect}
      options={options}
      isLoading={isLoading}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      isClearable
      placeholder={
        <div className="flex items-center justify-center w-full gap-2">
          <Search />
          <p className="text-primary-500">Search</p>
        </div>
      }
    />
  );
};

export default SearchBar;
