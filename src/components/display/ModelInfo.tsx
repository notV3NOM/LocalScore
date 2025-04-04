import { Model } from "@/lib/types";
import { getModelParamsString } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type ModelInfoProps = Model & {
  variant?: "standard" | "header";
};

const ModelInfo = ({
  name,
  quant,
  variantId,
  variant = "standard",
  params,
}: ModelInfoProps) => {
  const isHeader = variant === "header";

  return (
    <div className="grid grid-cols-12 w-full items-center gap-2 h-full">
      <Image
        src="/model.svg"
        width={16}
        height={16}
        alt="model icon"
        className="col-span-1 w-5 md:w-9"
      />
      <div className={`flex w-full col-span-9 ${isHeader ? "gap-4" : "gap-2"}`}>
        {variant === "standard" ? (
          <Link
            href={`/model/${variantId}`}
            className="text-primary-500 hover:underline"
          >
            <p className="font-medium md:text-base text-sm">{name}</p>
            <p className="sm:-mt-1 md:text-sm text-xs">{quant}</p>
          </Link>
        ) : (
          <div>
            <p className="font-medium md:text-2xl text-base">{name}</p>
            <p
              className={`${
                isHeader ? "md:text-base text-sm" : "md:text-sm text-xs"
              } font-light -mt-1`}
            >
              {quant}
            </p>
          </div>
        )}
      </div>

      <div
        className={`flex flex-col justify-center col-span-2 ${
          isHeader ? "items-end" : ""
        }`}
      >
        <span
          className={`font-medium ${
            variant === "header" ? "md:text-lg text-sm" : "md:text-base text-sm"
          }`}
        >
          {getModelParamsString(params)}
        </span>
        <span
          className={`${
            variant === "header" ? "md:text-base text-sm" : "md:text-sm text-xs"
          } font-light -mt-1`}
        >
          params
        </span>
      </div>
    </div>
  );
};

export default ModelInfo;
