import { logger } from "../../config/logger";
import { attendanceService } from "../../modules/attendance/attendance.service";

/** Automatic 6:30 PM IST cutoff — closes any still-open attendance session that never used
 *  its one-time Overtime Extension, stamping offlineAt at exactly the cutoff instant (see
 *  attendanceService.enforceAutomaticCutoff for the full rationale). No-ops quietly (not
 *  logged) when nothing is due, since this runs every minute and most runs will find
 *  nothing to do. */
export async function attendanceCutoffProcessor(): Promise<void> {
  const { closedCount } = await attendanceService.enforceAutomaticCutoff();
  if (closedCount > 0) {
    logger.info({ closedCount }, "Auto-closed attendance sessions past the 6:30 PM cutoff");
  }
}
