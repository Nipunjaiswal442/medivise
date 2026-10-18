export type AppointmentStatus = 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
export type AppointmentType = 'new-patient' | 'follow-up' | 'consultation' | 'check-up' | 'telehealth' | 'procedure' | 'lab-review';

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  'checked-in': 'Checked in',
  'in-progress': 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No-show',
};

export const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: 'ui-badge ui-badge-blue',
  'checked-in': 'ui-badge ui-badge-amber',
  'in-progress': 'ui-badge ui-badge-red',
  completed: 'ui-badge ui-badge-green',
  cancelled: 'ui-badge ui-badge-gray',
  'no-show': 'ui-badge ui-badge-gray',
};

export const TYPE_LABEL: Record<AppointmentType, string> = {
  'new-patient': 'New patient',
  'follow-up': 'Follow-up',
  consultation: 'Consultation',
  'check-up': 'Check-up',
  telehealth: 'Telehealth',
  procedure: 'Procedure',
  'lab-review': 'Lab review',
};
