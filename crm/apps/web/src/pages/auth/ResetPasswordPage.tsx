import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordSchema, type ResetPasswordInput } from "@gifftai/shared";
import { AuthLayout } from "./AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useResetPassword } from "../../features/auth/api";
import { toast } from "../../components/ui/Toast";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit((data) => {
    resetPassword.mutate(data, {
      onSuccess: () => {
        toast.success("Password updated — please sign in again");
        navigate("/login", { replace: true });
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Reset failed"),
    });
  });

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This password reset link is missing its token. Please request a new one.
        </p>
        <Link
          to="/forgot-password"
          className="mt-4 inline-block text-sm text-brand-600 hover:underline dark:text-brand-500"
        >
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <input type="hidden" {...register("token")} />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" className="w-full" isLoading={resetPassword.isPending}>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
