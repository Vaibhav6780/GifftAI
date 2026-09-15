import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { setUserPasswordSchema, updateUserSchema, type SetUserPasswordInput, type UpdateUserInput, type UserStatus } from "@gifftai/shared";
import {
  useDeactivateUser,
  useHardDeleteUser,
  useResendWelcome,
  useSetUserPassword,
  useSetUserRoles,
  useUpdateUser,
  useUpdateUserStatus,
  useUser,
} from "../../features/users/api";
import { AssignedLeadsTable } from "./AssignedLeadsTable";
import { AssignedTasksTable } from "./AssignedTasksTable";
import { useDepartmentsList } from "../../features/departments/api";
import { useRolesList } from "../../features/roles/api";
import { useAuthStore } from "../../features/auth/authStore";
import { useLogout } from "../../features/auth/api";
import { useHasPermission } from "../../hooks/usePermission";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";

const STATUS_VARIANT: Record<UserStatus, "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  INACTIVE: "neutral",
};

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isSelf = currentUser?.id === id;
  const canHardDelete = useHasPermission("users:delete_permanent");

  const { data: user, isLoading, isError, refetch } = useUser(id);
  const { data: departments } = useDepartmentsList();
  const { data: roles } = useRolesList();

  const updateUser = useUpdateUser(id!);
  const updateStatus = useUpdateUserStatus(id!);
  const setRoles = useSetUserRoles(id!);
  const deactivate = useDeactivateUser();
  const hardDelete = useHardDeleteUser();
  const resendWelcome = useResendWelcome(id!);
  const setPassword = useSetUserPassword(id!);
  const logout = useLogout();

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserInput>({ resolver: zodResolver(updateUserSchema) });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<SetUserPasswordInput>({ resolver: zodResolver(setUserPasswordSchema) });

  useEffect(() => {
    if (!user) return;
    reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      jobTitle: user.jobTitle,
      departmentId: user.departmentId,
    });
    setSelectedRoleIds(user.roles.map((r) => r.id));
  }, [user, reset]);

  if (isLoading) return <PageSpinner />;
  if (isError || !user) return <ErrorState description="Couldn't load this user." onRetry={() => refetch()} />;

  const onSubmitProfile = handleSubmit((data) => {
    updateUser.mutate(data, {
      onSuccess: () => toast.success("Profile updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update user"),
    });
  });

  function handleStatusChange(status: UserStatus) {
    updateStatus.mutate(
      { status },
      {
        onSuccess: () => toast.success(`User marked ${status.toLowerCase()}`),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update status"),
      },
    );
  }

  function handleSaveRoles() {
    setRoles.mutate(
      { roleIds: selectedRoleIds },
      {
        onSuccess: () => toast.success("Roles updated"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update roles"),
      },
    );
  }

  function handleDeactivate() {
    deactivate.mutate(id!, {
      onSuccess: () => {
        toast.success("User deactivated");
        navigate("/users");
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to deactivate user"),
    });
  }

  function handleHardDelete() {
    hardDelete.mutate(id!, {
      onSuccess: () => {
        toast.success("User permanently deleted");
        navigate("/users");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete user");
        setConfirmDeleteOpen(false);
      },
    });
  }

  const onSubmitPassword = handleSubmitPassword((data) => {
    setPassword.mutate(data, {
      onSuccess: () => {
        resetPassword();
        if (isSelf) {
          toast.success("Password changed — please sign in again");
          logout.mutate(undefined, {
            onSettled: () => navigate("/login", { replace: true }),
          });
        } else {
          toast.success("Password updated — they'll need to sign in again");
        }
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update password"),
    });
  });

  function handleResendWelcome() {
    resendWelcome.mutate(undefined, {
      onSuccess: () => toast.success("Welcome email resent"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to resend email"),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>
        <Badge variant={STATUS_VARIANT[user.status]}>{user.status}</Badge>
      </div>

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Profile</h2>
        <form className="flex flex-col gap-4" onSubmit={onSubmitProfile} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" error={errors.firstName?.message} {...register("firstName")} />
            <Input label="Last name" error={errors.lastName?.message} {...register("lastName")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
            <Input label="Job title" error={errors.jobTitle?.message} {...register("jobTitle")} />
          </div>
          <Select label="Department" error={errors.departmentId?.message} {...register("departmentId")}>
            <option value="">No department</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <div className="flex justify-end">
            <Button type="submit" isLoading={updateUser.isPending}>
              Save profile
            </Button>
          </div>
        </form>
      </Card>

      <AssignedLeadsTable userId={user.id} />

      <AssignedTasksTable userId={user.id} />

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Roles</h2>
        <div className="flex flex-col gap-2">
          {roles?.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={isSelf}
                checked={selectedRoleIds.includes(role.id)}
                onChange={(e) => {
                  setSelectedRoleIds((prev) =>
                    e.target.checked ? [...prev, role.id] : prev.filter((id_) => id_ !== role.id),
                  );
                }}
              />
              {role.name}
            </label>
          ))}
        </div>
        {isSelf && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">You cannot change your own roles.</p>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveRoles} isLoading={setRoles.isPending} disabled={isSelf}>
            Save roles
          </Button>
        </div>
      </Card>

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Password</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Set a new password for {isSelf ? "your own account" : `${user.firstName} ${user.lastName}`}. This
          signs {isSelf ? "you" : "them"} out of every existing session.
        </p>
        <form className="flex flex-col gap-4" onSubmit={onSubmitPassword} noValidate>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={passwordErrors.password?.message}
            {...registerPassword("password")}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={passwordErrors.confirmPassword?.message}
            {...registerPassword("confirmPassword")}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={setPassword.isPending}>
              Change password
            </Button>
          </div>
        </form>
      </Card>

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Account actions</h2>
        {isSelf ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">You cannot change your own account status.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {user.status !== "ACTIVE" && (
              <Button variant="secondary" onClick={() => handleStatusChange("ACTIVE")} isLoading={updateStatus.isPending}>
                Activate
              </Button>
            )}
            {user.status !== "SUSPENDED" && (
              <Button variant="secondary" onClick={() => handleStatusChange("SUSPENDED")} isLoading={updateStatus.isPending}>
                Suspend
              </Button>
            )}
            {user.status !== "INACTIVE" && (
              <Button variant="danger" onClick={handleDeactivate} isLoading={deactivate.isPending}>
                Deactivate
              </Button>
            )}
          </div>
        )}
        {!user.isEmailVerified && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
              This user hasn't set their password yet.
            </p>
            <Button variant="secondary" onClick={handleResendWelcome} isLoading={resendWelcome.isPending}>
              Resend welcome email
            </Button>
          </div>
        )}
      </Card>

      {canHardDelete && !isSelf && (
        <Card className="max-w-2xl border-red-200 p-6 dark:border-red-900">
          <h2 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Permanently deletes this user's account. Unlike Deactivate, this cannot be undone and removes their
            login, sessions, and attendance history. Blocked if they've created tasks, notes, or other content —
            reassign or remove that first, or use Deactivate instead.
          </p>
          <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
            Delete permanently
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Permanently delete this user?"
        description={`This will irreversibly delete ${user.firstName} ${user.lastName}'s account. This cannot be undone.`}
        confirmLabel="Delete permanently"
        isLoading={hardDelete.isPending}
        onConfirm={handleHardDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
