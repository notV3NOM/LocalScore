import {
  AcceleratorSchema,
  PerformanceScoresSchema,
  Run,
  RunsSchema,
  RunsSchemaWithDetailedResults,
  SortDirection,
  UniqueAccelerator,
  UniqueModel,
} from "@/lib/types";
import db from ".";
import {
  acceleratorModelPerformanceScores,
  accelerators,
  benchmarkPerformanceScores,
  benchmarkRuns,
  benchmarkSystems,
  models,
  modelVariants,
  testResults,
} from "./schema";
import {
  inArray,
  sql,
  eq,
  DrizzleError,
  and,
  asc,
  desc,
  isNotNull,
} from "drizzle-orm";
import { z, ZodError } from "zod";

export const getModelVariants = async (filters: UniqueModel[]) => {
  const result = await db
    .select({
      variantId: modelVariants.id,
      modelId: models.id,
      modelName: models.name,
      modelParams: models.params,
    })
    .from(modelVariants)
    .innerJoin(models, eq(modelVariants.model_id, models.id))
    .where(
      inArray(
        sql`(${models.name}, ${modelVariants.quantization})`,
        filters.map((spec) => [spec.name, spec.quant])
      )
    );

  return result;
};

export const getAccelerators = async (filters: UniqueAccelerator[]) => {
  const result = await db
    .select({ id: accelerators.id })
    .from(accelerators)
    .where(
      inArray(
        sql`(${accelerators.name}, ${accelerators.memory_gb})`,
        filters.map((spec) => [spec.name, spec.memory])
      )
    );

  return result.map((row) => row.id);
};

export const getAcceleratorsById = async (ids: number[] | number) => {
  const idArray = Array.isArray(ids) ? ids : [ids];
  const result = await db
    .select()
    .from(accelerators)
    .where(inArray(accelerators.id, idArray));

  const parsed = z.array(AcceleratorSchema).parse(result);
  return idArray.length === 1 ? parsed[0] : parsed;
};

export const getTopAcceleratorsByModelVariants = async ({
  modelVariantIds,
  numResults,
}: {
  modelVariantIds: number[];
  numResults?: number;
}) => {
  const query = db
    .select({ id: accelerators.id })
    .from(accelerators)
    .innerJoin(
      acceleratorModelPerformanceScores,
      eq(accelerators.id, acceleratorModelPerformanceScores.accelerator_id)
    )
    .where(
      inArray(
        acceleratorModelPerformanceScores.model_variant_id,
        modelVariantIds
      )
    )
    .groupBy(accelerators.id)
    .orderBy(
      sql`AVG(${acceleratorModelPerformanceScores.performance_score}) DESC`
    );

  const acceleratorIds = numResults
    ? await query.limit(numResults)
    : await query;

  return acceleratorIds.map((row) => row.id);
};
export const getPerforamanceModelVariantsByAcceleratorId = async function (
  acceleratorId: number
): Promise<number[]> {
  return await db
    .select({
      model_variant_id: acceleratorModelPerformanceScores.model_variant_id,
    })
    .from(acceleratorModelPerformanceScores)
    .where(
      and(
        eq(acceleratorModelPerformanceScores.accelerator_id, acceleratorId),
        isNotNull(acceleratorModelPerformanceScores.model_variant_id)
      )
    )
    .then((results) =>
      results
        .filter(
          (result): result is { model_variant_id: number } =>
            result.model_variant_id !== null
        )
        .map((result) => result.model_variant_id)
    );
};

export const getPerformanceScores = async (
  acceleratorIds: number[],
  modelVariantIds: number[]
) => {
  try {
    // First, get all model information for the requested variant IDs
    const modelInfo = await db
      .select({
        model_id: models.id,
        model_name: models.name,
        model_params: models.params,
        variant_id: modelVariants.id,
        model_quant: modelVariants.quantization,
      })
      .from(modelVariants)
      .innerJoin(models, eq(modelVariants.model_id, models.id))
      .where(inArray(modelVariants.id, modelVariantIds));

    const rankings = await db
      .select({
        model_variant_id: acceleratorModelPerformanceScores.model_variant_id,
        accelerator_id: acceleratorModelPerformanceScores.accelerator_id,
        performance_rank: sql`RANK() OVER (
          PARTITION BY ${acceleratorModelPerformanceScores.model_variant_id}
          ORDER BY ${acceleratorModelPerformanceScores.performance_score} DESC
        )`,
        number_ranked: sql`COUNT(*) OVER (
          PARTITION BY ${acceleratorModelPerformanceScores.model_variant_id}
        )`,
      })
      .from(acceleratorModelPerformanceScores)
      .where(
        inArray(
          acceleratorModelPerformanceScores.model_variant_id,
          modelVariantIds
        )
      );

    // Fetch performance scores if they exist
    const performanceScores = await db
      .select({
        accelerator_id: acceleratorModelPerformanceScores.accelerator_id,
        accelerator_name: acceleratorModelPerformanceScores.accelerator_name,
        accelerator_type: acceleratorModelPerformanceScores.accelerator_type,
        accelerator_memory_gb:
          acceleratorModelPerformanceScores.accelerator_memory_gb,
        model_name: acceleratorModelPerformanceScores.model_name,
        model_quant: acceleratorModelPerformanceScores.model_variant_quant,
        model_id: acceleratorModelPerformanceScores.model_id,
        model_variant_id: acceleratorModelPerformanceScores.model_variant_id,
        avg_prompt_tps: acceleratorModelPerformanceScores.avg_prompt_tps,
        avg_gen_tps: acceleratorModelPerformanceScores.avg_gen_tps,
        avg_ttft: acceleratorModelPerformanceScores.avg_ttft,
        avg_prompt_tps_watt:
          acceleratorModelPerformanceScores.avg_prompt_tps_watt,
        avg_joules: acceleratorModelPerformanceScores.avg_joules,
        avg_gen_tps_watt: acceleratorModelPerformanceScores.avg_gen_tps_watt,
        performance_score: acceleratorModelPerformanceScores.performance_score,
        efficiency_score: acceleratorModelPerformanceScores.efficiency_score,
      })
      .from(acceleratorModelPerformanceScores)
      .where(
        and(
          inArray(
            acceleratorModelPerformanceScores.accelerator_id,
            acceleratorIds
          ),
          inArray(
            acceleratorModelPerformanceScores.model_variant_id,
            modelVariantIds
          )
        )
      )
      .orderBy(
        sql`${acceleratorModelPerformanceScores.performance_score} DESC`
      );

    // Create base result structure from model info
    const groupedResults = modelInfo.map((info) => ({
      model: {
        name: info.model_name,
        id: info.model_id,
        variantId: info.variant_id,
        quant: info.model_quant,
        params: info.model_params,
      },
      results: performanceScores
        .filter((score) => score.model_variant_id === info.variant_id)
        .map((score) => ({
          ...score,
          performance_score: (parseFloat(score.performance_score || "0") * 10)
            .toFixed()
            .toString(),
          efficiency_score: (parseFloat(score.efficiency_score || "0") * 10)
            .toFixed(2)
            .toString(),
          performance_rank: rankings.find(
            (rank) =>
              rank.model_variant_id === score.model_variant_id &&
              rank.accelerator_id === score.accelerator_id
          )?.performance_rank,
          number_ranked: rankings.find(
            (rank) =>
              rank.model_variant_id === score.model_variant_id &&
              rank.accelerator_id === score.accelerator_id
          )?.number_ranked,
        })),
    }));

    // Validate results
    const validatedResults = PerformanceScoresSchema.safeParse(groupedResults);

    if (!validatedResults.success) {
      throw validatedResults.error;
    }

    return validatedResults.data;
  } catch (error) {
    if (error instanceof DrizzleError) {
      throw new Error(`Database error: ${error.message}`);
    } else if (error instanceof ZodError) {
      throw new Error(`Validation error: ${error.message}`);
    } else {
      throw new Error(
        `Unexpected error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
};

export const getBenchmarkResults = async ({
  sortDirection,
  limit,
  offset,
}: {
  sortDirection: SortDirection;
  limit: number;
  offset: number;
}): Promise<Run[]> => {
  const selected = await db
    .select({
      system: benchmarkSystems,
      benchmarkRun: benchmarkRuns,
      accelerator: accelerators,
      modelVariant: modelVariants,
      model: models,
      avg_prompt_tps: benchmarkPerformanceScores.avg_prompt_tps,
      avg_gen_tps: benchmarkPerformanceScores.avg_gen_tps,
      avg_ttft: benchmarkPerformanceScores.avg_ttft_ms,
      performance_score: benchmarkPerformanceScores.performance_score,
    })
    .from(benchmarkRuns)
    .innerJoin(accelerators, eq(accelerators.id, benchmarkRuns.accelerator_id))
    .innerJoin(
      modelVariants,
      eq(modelVariants.id, benchmarkRuns.model_variant_id)
    )
    .innerJoin(models, eq(models.id, modelVariants.model_id))
    .innerJoin(
      benchmarkSystems,
      eq(benchmarkSystems.id, benchmarkRuns.system_id)
    )
    .innerJoin(
      benchmarkPerformanceScores,
      eq(benchmarkPerformanceScores.benchmark_run_id, benchmarkRuns.id)
    )
    .orderBy(
      sortDirection === "desc"
        ? desc(benchmarkRuns.created_at)
        : asc(benchmarkRuns.created_at)
    )
    .limit(limit)
    .offset(offset);

  const res = selected.map((row) => ({
    ...row.benchmarkRun,
    system: row.system,
    accelerator: row.accelerator.name,
    accelerator_type: row.accelerator.type,
    accelerator_memory_gb: row.accelerator.memory_gb,
    model: {
      ...row.model,
      quant: row.modelVariant.quantization,
      variantId: row.modelVariant.id,
    },
    avg_prompt_tps: parseFloat(row.avg_prompt_tps || "0"),
    avg_gen_tps: parseFloat(row.avg_gen_tps || "0"),
    avg_ttft: parseFloat(row.avg_ttft || "0"),
    performance_score: parseFloat(row.performance_score || "0"),
  }));
  const parsedResults = RunsSchema.parse(res);

  return parsedResults;
};

export const getBenchmarkResult = async (
  benchmarkRunId: number
): Promise<Run> => {
  const selected = await db
    .select({
      system: benchmarkSystems,
      benchmarkRun: benchmarkRuns,
      accelerator: accelerators,
      modelVariant: modelVariants,
      model: models,
      testResults: sql`json_agg(${testResults})`,
      avg_prompt_tps: benchmarkPerformanceScores.avg_prompt_tps,
      avg_gen_tps: benchmarkPerformanceScores.avg_gen_tps,
      avg_ttft: benchmarkPerformanceScores.avg_ttft_ms,
      performance_score: benchmarkPerformanceScores.performance_score,
    })
    .from(benchmarkRuns)
    .innerJoin(accelerators, eq(accelerators.id, benchmarkRuns.accelerator_id))
    .innerJoin(
      modelVariants,
      eq(modelVariants.id, benchmarkRuns.model_variant_id)
    )
    .innerJoin(models, eq(models.id, modelVariants.model_id))
    .innerJoin(
      benchmarkSystems,
      eq(benchmarkSystems.id, benchmarkRuns.system_id)
    )
    .innerJoin(
      benchmarkPerformanceScores,
      eq(benchmarkPerformanceScores.benchmark_run_id, benchmarkRuns.id)
    )
    .leftJoin(testResults, eq(testResults.benchmark_run_id, benchmarkRuns.id))
    .where(eq(benchmarkRuns.id, benchmarkRunId))
    .groupBy(
      benchmarkSystems.id,
      benchmarkRuns.id,
      accelerators.id,
      models.id,
      modelVariants.id,
      benchmarkPerformanceScores.avg_prompt_tps,
      benchmarkPerformanceScores.avg_gen_tps,
      benchmarkPerformanceScores.avg_ttft_ms,
      benchmarkPerformanceScores.performance_score
    )
    .limit(1);

  if (selected.length === 0) {
    throw new Error(`Benchmark run with ID ${benchmarkRunId} not found`);
  }

  const row = selected[0];
  const result = {
    ...row.benchmarkRun,
    system: row.system,
    accelerator: row.accelerator.name,
    accelerator_type: row.accelerator.type,
    accelerator_memory_gb: row.accelerator.memory_gb,
    model: {
      ...row.model,
      quant: row.modelVariant.quantization,
      variantId: row.modelVariant.id,
    },
    results: row.testResults,
    avg_prompt_tps: parseFloat(row.avg_prompt_tps || "0"),
    avg_gen_tps: parseFloat(row.avg_gen_tps || "0"),
    avg_ttft: parseFloat(row.avg_ttft || "0"),
    performance_score: parseFloat(row.performance_score || "0") * 10,
  };

  return RunsSchemaWithDetailedResults.parse(result);
};

// export getAcceleratorRank
