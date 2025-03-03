import { PerformanceScore } from "@/lib/types";
import Link from "next/link";
import React from "react";
import Image from "next/image";

const LeaderboardTableHeader = ({ data }: { data: PerformanceScore }) => {
  return (
    <div className="flex py-2 items-center gap-2">
      <Image src={"/model.svg"} alt="model icon" width={24} height={24} />
      <div>
        <Link
          href={`/model/${data.model.variantId}`}
          className="font-light relative group"
        >
          <span className="flex flex-col sm:flex-row sm:gap-2">
            <span className="font-semibold sm:text-lg">{data.model.name}</span>
            <span className="sm:text-lg">{data.model.quant}</span>
          </span>
          <span className="absolute bottom-0 left-0 w-full h-[1px] bg-current scale-x-0 group-hover:scale-x-100 transition-transform"></span>
        </Link>
      </div>
    </div>
  );
};

export default LeaderboardTableHeader;
