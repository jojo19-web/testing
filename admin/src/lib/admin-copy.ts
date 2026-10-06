export function scanStatusLabel(status: string): string {
  switch (status) {
    case "pending_review":
      return "Pending admin approval";
    case "published":
      return "Published";
    case "quarantined":
      return "Hidden for review";
    case "removed":
      return "Removed";
    case "expired":
      return "Expired";
    default:
      return status.replaceAll("_", " ");
  }
}

export function reportReasonLabel(reason: string): string {
  switch (reason) {
    case "incorrect_result":
      return "Wrong result";
    case "not_eggplant":
      return "Not an eggplant";
    case "inappropriate":
      return "Inappropriate";
    case "duplicate":
      return "Duplicate";
    case "other":
      return "Other";
    default:
      return reason.replaceAll("_", " ");
  }
}

export function scanStatusTone(status: string): string {
  switch (status) {
    case "pending_review":
      return "bg-[#fff0dd] text-[#995a06]";
    case "published":
      return "bg-[#e9f6eb] text-[#247936]";
    case "removed":
      return "bg-[#fff0f2] text-[#a92f40]";
    default:
      return "bg-[#fff0dd] text-[#995a06]";
  }
}

export function requestStatusLabel(status: string): string {
  switch (status) {
    case "upload_pending":
      return "Waiting for photos";
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under review";
    case "needs_information":
      return "Needs information";
    case "planned":
      return "Planned";
    case "not_supported":
      return "Not supported";
    case "closed":
      return "Closed";
    case "cancelled":
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

export function adminRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "reviewer":
      return "Reviewer";
    default:
      return role.replaceAll("_", " ");
  }
}

export function adminActionLabel(action: string): string {
  switch (action) {
    case "catalog_publish":
      return "Disease catalog update";
    case "request_review":
      return "Disease request review";
    case "scan_moderation":
      return "Global scan review";
    case "cloud_writes_toggle":
      return "Mobile submission setting";
    default:
      return action.replaceAll("_", " ");
  }
}
