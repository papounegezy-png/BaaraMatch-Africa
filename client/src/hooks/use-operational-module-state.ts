import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ModuleApiResponse<T> = {
  state: T | null;
  updatedAt: string | null;
};

export function useOperationalModuleState<T extends Record<string, unknown>>(
  moduleKey: string,
  fallbackState: T,
) {
  const queryKey = [`/api/company/modules/${moduleKey}/state`];

  const query = useQuery<ModuleApiResponse<T>>({
    queryKey,
  });

  const saveMutation = useMutation({
    mutationFn: async (nextState: T) => {
      const res = await apiRequest("PATCH", `/api/company/modules/${moduleKey}/state`, {
        state: nextState,
      });
      return (await res.json()) as ModuleApiResponse<T>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    moduleState: query.data?.state ?? fallbackState,
    isLoadingModuleState: query.isLoading,
    saveModuleState: saveMutation.mutateAsync,
    isSavingModuleState: saveMutation.isPending,
  };
}
