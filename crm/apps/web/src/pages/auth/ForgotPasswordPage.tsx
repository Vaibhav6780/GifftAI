import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@gifftai/shared";
import { AuthLayout } from "./AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useForgotPassword } from "../../features/auth/api";

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((data) => forgotPassword.mutate(data));

  if (forgotPassword.isSuccess) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          If an account exists for that email, we've sent a link to reset your password. It expires in 30
          minutes.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm text-brand-600 hover:underline dark:text-brand-500">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password" subtitle="We'll email you a link to reset it">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Button type="submit" className="w-full" isLoading={forgotPassword.isPending}>
          Send reset link
        </Button>
        <Link to="/login" className="text-center text-sm text-brand-600 hover:underline dark:text-brand-500">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
