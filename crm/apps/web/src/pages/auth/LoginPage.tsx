import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@gifftai/shared";
import { AuthLayout } from "./AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useLogin } from "../../features/auth/api";
import { toast } from "../../components/ui/Toast";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((data) => {
    login.mutate(data, {
      onSuccess: () => navigate("/dashboard", { replace: true }),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Login failed"),
    });
  });

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back — enter your details to continue">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline dark:text-brand-500">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" isLoading={login.isPending}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
