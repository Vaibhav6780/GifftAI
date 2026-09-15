import { Link } from "react-router-dom";
import { useTasksList } from "../../features/tasks/api";
import { TaskNoteCell } from "../../features/tasks/components/TaskNoteCell";
import { TaskStatusCell } from "../../features/tasks/components/TaskStatusCell";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";

const SHOWN = 10;

export function AssignedTasksTable({ userId }: { userId: string }) {
  const { data, isLoading } = useTasksList({ assignedToId: userId, pageSize: SHOWN, sortBy: "createdAt", sortOrder: "desc" });

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Assigned Tasks {data ? `(${data.total})` : ""}
        </h2>
        <Link to={`/tasks?assignedToId=${userId}`} className="text-sm text-brand-600 hover:underline dark:text-brand-500">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : !data?.items.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No tasks assigned.</p>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Task</Th>
              <Th>Status</Th>
              <Th>Note</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.items.map((task) => (
              <Tr key={task.id}>
                <Td>
                  <Link
                    to={`/tasks/${task.id}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                  >
                    {task.title}
                  </Link>
                </Td>
                <Td>
                  <TaskStatusCell taskId={task.id} assignedToId={task.assignedToId} status={task.status} />
                </Td>
                <Td>
                  <TaskNoteCell taskId={task.id} assignedToId={task.assignedToId} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Card>
  );
}
