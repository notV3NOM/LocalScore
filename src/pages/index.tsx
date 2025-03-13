import Leaderboard from "@/components/leaderboard/Leaderboard";
import Meta from "@/components/layout/Meta";
import Separator from "@/components/ui/Separator";
import {
  getModelVariants,
  getPerformanceScores,
  getTopAcceleratorsByModelVariants,
} from "@/db/queries";
import { OFFICIAL_MODELS } from "@/lib/config";
import { PerformanceScore } from "@/lib/types";
import { GetServerSideProps } from "next";
import Link from "next/link";

export default function Home({ results }: { results: PerformanceScore[] }) {
  return (
    <>
      <Meta />
      <div className="flex flex-col gap-5 md:text-xl">
        <div className="text-center">
          <p>
            <b>LocalScore</b> is an open benchmark which helps you understand
            how well your computer can handle AI tasks.{" "}
          </p>
          {/* <Link href="/about" className="text-primary-500 hover:underline">
            Learn more
          </Link> */}
        </div>
        <Separator thickness={2} />
      </div>
      <Leaderboard data={results} variant="homepage" />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=1, stale-while-revalidate=59"
  );

  const models = OFFICIAL_MODELS.map((model) => ({
    name: model.name,
    quant: model.quant,
  }));

  const modelVariants = await getModelVariants(models);
  const modelVariantIds = modelVariants.map((mv) => mv.variantId);
  const acceleratorIds = await getTopAcceleratorsByModelVariants({
    modelVariantIds,
    numResults: 100,
  });

  const results = await getPerformanceScores(acceleratorIds, modelVariantIds);

  return {
    props: {
      results,
    },
  };
};
