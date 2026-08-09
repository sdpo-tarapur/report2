import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserAccount, FIRCase, LandDispute, UDCase, InvestigatingOfficer, DailyCrimeReport } from '../types';

/**
 * Service to sync application state with Supabase tables.
 * If Supabase is not configured yet (e.g. env vars missing),
 * methods silently return null so local state is used safely.
 */

// --- USER ACCOUNTS ---
export async function fetchUserAccountsFromSupabase(): Promise<UserAccount[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.from('user_accounts').select('*');
    if (error) {
      console.error('Supabase fetch user_accounts error:', error);
      return null;
    }

    if (!data) return [];

    // Safely map Supabase rows to UserAccount objects
    return data.map((row: any) => ({
      id: String(row.id || `user-${Date.now()}`),
      // Handle both camelCase (userId) and snake_case (user_id) column names safely
      userId: String(row.userId || row.user_id || '').trim(),
      password: String(row.password || ''),
      role: row.role || 'SDPO',
      permissionLevel: row.permissionLevel || row.permission_level || 'EDITOR',
      officerName: String(row.officerName || row.officer_name || 'Officer'),
      rank: String(row.rank || 'Police Officer'),
      policeStation: row.policeStation || row.police_station || 'Subdivision HQ',
      contactNumber: row.contactNumber || row.contact_number || '',
      isActive: row.isActive ?? row.is_active ?? true,
    }));
  } catch (err) {
    console.error('Failed to fetch user accounts:', err);
    return null;
  }
}

export async function saveUserAccountToSupabase(account: UserAccount): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('user_accounts').upsert([account], { onConflict: 'id' });
    if (error) {
      console.error('Error saving user account to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

export async function deleteUserAccountFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('user_accounts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting user account from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

// --- FIR CASES ---
// Helper to safely format dates (converts empty strings "" to null for PostgreSQL DATE types)
const formatDateForSupabase = (dateStr?: string | null): string | null => {
  if (!dateStr || dateStr.trim() === '') return null;
  return dateStr.trim();
};

// --- FIR CASES ---
export async function fetchFIRCasesFromSupabase(): Promise<FIRCase[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('fir_cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching FIR cases from Supabase:', error);
      return null;
    }

    if (!data) return [];

    // Map snake_case PostgreSQL columns back to camelCase React state objects
    return data.map((row: any) => ({
      id: row.id,
      firNumber: row.fir_number || '',
      ps: row.ps,
      firDate: row.fir_date || '',
      sections: row.sections || '',
      complainantName: row.complainant_name || '',
      complainantPhone: row.complainant_phone || undefined,
      placeOfOccurrence: row.place_of_occurrence || '',
      ioName: row.io_name || '',
      designation: row.designation || 'PENDING_DESIGNATION',
      designationDate: row.designation_date || undefined,
      deadlineDays: row.deadline_days || 60,
      status: row.status || 'Under Investigation',
      chargesheetNumber: row.chargesheet_number || undefined,
      chargesheetDate: row.chargesheet_date || undefined,
      chargesheetUploadedCCTNS: row.chargesheet_uploaded_cctns ?? false,
      chargesheetCCTNSDate: row.chargesheet_cctns_date || undefined,
      caseDiaryUploadedCCTNS: row.case_diary_uploaded_cctns ?? false,
      lastCaseDiaryNo: row.last_case_diary_no || undefined,
      lastCaseDiaryDate: row.last_case_diary_date || undefined,
      poVisitDate: row.po_visit_date || undefined,
      supervisionDate: row.supervision_date || undefined,
      prDates: row.pr_dates || undefined,
      finalPrDate: row.final_pr_date || undefined,
      caseReviewDates: row.case_review_dates || undefined,
      sdpoSupervisionNote: row.sdpo_supervision_note || undefined,
      ciSupervisionNote: row.ci_supervision_note || undefined,
      psProgressRemarks: row.ps_progress_remarks || undefined,
      createdAt: row.created_at || new Date().toISOString().split('T')[0],
      updatedAt: row.updated_at || new Date().toISOString().split('T')[0],
    }));
  } catch (err) {
    console.error('Supabase exception fetching FIR cases:', err);
    return null;
  }
}

export async function saveFIRCaseToSupabase(firCase: FIRCase): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || !firCase) return false;

  try {
    // Map camelCase React fields to match your exact Supabase snake_case schema
    const payload = {
      id: firCase.id,
      fir_number: firCase.firNumber,
      ps: firCase.ps,
      fir_date: formatDateForSupabase(firCase.firDate),
      sections: firCase.sections,
      complainant_name: firCase.complainantName,
      complainant_phone: firCase.complainantPhone || null,
      place_of_occurrence: firCase.placeOfOccurrence,
      io_name: firCase.ioName,
      designation: firCase.designation || 'PENDING_DESIGNATION',
      designation_date: formatDateForSupabase(firCase.designationDate),
      deadline_days: Number(firCase.deadlineDays) || 60,
      status: firCase.status || 'Under Investigation',
      chargesheet_number: firCase.chargesheetNumber || null,
      chargesheet_date: formatDateForSupabase(firCase.chargesheetDate),
      chargesheet_uploaded_cctns: Boolean(firCase.chargesheetUploadedCCTNS),
      chargesheet_cctns_date: formatDateForSupabase(firCase.chargesheetCCTNSDate),
      case_diary_uploaded_cctns: Boolean(firCase.caseDiaryUploadedCCTNS),
      last_case_diary_no: firCase.lastCaseDiaryNo || null,
      last_case_diary_date: formatDateForSupabase(firCase.lastCaseDiaryDate),
      po_visit_date: formatDateForSupabase(firCase.poVisitDate),
      supervision_date: formatDateForSupabase(firCase.supervisionDate),
      pr_dates: firCase.prDates && firCase.prDates.length > 0 ? firCase.prDates : null,
      final_pr_date: formatDateForSupabase(firCase.finalPrDate),
      case_review_dates: firCase.caseReviewDates && firCase.caseReviewDates.length > 0 ? firCase.caseReviewDates : null,
      sdpo_supervision_note: firCase.sdpoSupervisionNote || null,
      ci_supervision_note: firCase.ciSupervisionNote || null,
      ps_progress_remarks: firCase.psProgressRemarks || null,
      created_at: firCase.createdAt ? new Date(firCase.createdAt).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('fir_cases')
      .upsert([payload], { onConflict: 'id' });

    if (error) {
      console.error('Error saving FIR case to Supabase:', error.message, error.details);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Supabase exception saving FIR case:', err);
    return false;
  }
}
export async function deleteFIRCaseFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('fir_cases').delete().eq('id', id);
    if (error) {
      console.error('Error deleting FIR case from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

// --- LAND DISPUTES ---


// --- LAND DISPUTES ---
export async function fetchLandDisputesFromSupabase(): Promise<LandDispute[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('land_disputes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching land disputes from Supabase:', error);
      return null;
    }

    if (!data) return [];

    // Map PostgreSQL snake_case columns back to camelCase React properties
    return data.map((row: any) => ({
      id: row.id,
      ps: row.ps,
      date: row.date || '',
      victimName: row.victim_name || row.victimName || '',
      victimAddress: row.victim_address || row.victimAddress || '',
      oppositePartyName: row.opposite_party_name || row.oppositePartyName || undefined,
      plotDetails: row.plot_details || row.plotDetails || '',
      disputeNature: row.dispute_nature || row.disputeNature || '',
      status: row.status || 'Pending',
      disposalDate: row.disposal_date || row.disposalDate || undefined,
      disposalRemarks: row.disposal_remarks || row.disposalRemarks || undefined,
      janataDarbarAction: row.janata_darbar_action || row.janataDarbarAction || undefined,
      createdAt: row.created_at || new Date().toISOString().split('T')[0],
    }));
  } catch (err) {
    console.error('Supabase exception fetching Land Disputes:', err);
    return null;
  }
}

export async function saveLandDisputeToSupabase(dispute: LandDispute): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || !dispute) return false;
  try {
    // Map camelCase React fields to match your exact Supabase land_disputes schema
    const payload = {
      id: dispute.id,
      ps: dispute.ps,
      date: formatDateForSupabase(dispute.date),
      victim_name: dispute.victimName,
      victim_address: dispute.victimAddress,
      opposite_party_name: dispute.oppositePartyName || null,
      plot_details: dispute.plotDetails,
      dispute_nature: dispute.disputeNature,
      status: dispute.status || 'Pending',
      disposal_date: formatDateForSupabase(dispute.disposalDate),
      disposal_remarks: dispute.disposalRemarks || null,
      janata_darbar_action: dispute.janataDarbarAction || null,
      created_at: dispute.createdAt ? new Date(dispute.createdAt).toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase
      .from('land_disputes')
      .upsert([payload], { onConflict: 'id' });

    if (error) {
      console.error('Error saving land dispute to Supabase:', error.message, error.details);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception saving land dispute:', err);
    return false;
  }
}

// --- UD CASES ---
export async function fetchUDCasesFromSupabase(): Promise<UDCase[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('ud_cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching UD cases from Supabase:', error);
      return null;
    }

    if (!data) return [];

    // Map PostgreSQL snake_case columns back to camelCase React properties
    return data.map((row: any) => ({
      id: row.id,
      udCaseNo: row.ud_case_no || row.udCaseNo || '',
      ps: row.ps,
      date: row.date || '',
      deceasedName: row.deceased_name || row.deceasedName || '',
      deceasedAgeGender: row.deceased_age_gender || row.deceasedAgeGender || undefined,
      placeOfOccurrence: row.place_of_occurrence || row.placeOfOccurrence || '',
      causeOfDeath: row.cause_of_death || row.causeOfDeath || '',
      postMortemReportStatus: row.post_mortem_report_status || row.postMortemReportStatus || 'Pending',
      visceralReportStatus: row.visceral_report_status || row.visceralReportStatus || 'Not Required',
      status: row.status || 'Under Investigation',
      ciSupervisionRemarks: row.ci_supervision_remarks || row.ciSupervisionRemarks || undefined,
      sdpoRemarks: row.sdpo_remarks || row.sdpoRemarks || undefined,
    }));
  } catch (err) {
    console.error('Supabase exception fetching UD Cases:', err);
    return null;
  }
}

export async function saveUDCaseToSupabase(udCase: UDCase): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || !udCase) return false;
  try {
    // Map camelCase React fields to match your exact Supabase ud_cases schema
    const payload = {
      id: udCase.id,
      ud_case_no: udCase.udCaseNo,
      ps: udCase.ps,
      date: formatDateForSupabase(udCase.date),
      deceased_name: udCase.deceasedName,
      deceased_age_gender: udCase.deceasedAgeGender || null,
      place_of_occurrence: udCase.placeOfOccurrence,
      cause_of_death: udCase.causeOfDeath,
      post_mortem_report_status: udCase.postMortemReportStatus || 'Pending',
      visceral_report_status: udCase.visceralReportStatus || 'Not Required',
      status: udCase.status || 'Under Investigation',
      ci_supervision_remarks: udCase.ciSupervisionRemarks || null,
      sdpo_remarks: udCase.sdpoRemarks || null,
    };

    const { error } = await supabase
      .from('ud_cases')
      .upsert([payload], { onConflict: 'id' });

    if (error) {
      console.error('Error saving UD case to Supabase:', error.message, error.details);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception saving UD case:', err);
    return false;
  }
}// --- INVESTIGATING OFFICERS (IOs) ---
export async function fetchIOsFromSupabase(): Promise<InvestigatingOfficer[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('investigating_officers').select('*');
    if (error) {
      console.error('Error fetching IOs from Supabase:', error);
      return null;
    }
    return data as InvestigatingOfficer[];
  } catch (err) {
    console.error('Supabase exception:', err);
    return null;
  }
}

export async function saveIOToSupabase(io: InvestigatingOfficer): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('investigating_officers').upsert([io], { onConflict: 'id' });
    if (error) {
      console.error('Error saving IO to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

export async function deleteIOFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('investigating_officers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting IO from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

// --- DAILY CRIME REPORTS ---
export async function fetchDailyReportsFromSupabase(): Promise<DailyCrimeReport[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('daily_crime_reports').select('*').order('date', { ascending: false });
    if (error) {
      console.error('Error fetching daily reports from Supabase:', error);
      return null;
    }
    return data as DailyCrimeReport[];
  } catch (err) {
    console.error('Supabase exception:', err);
    return null;
  }
}

export async function saveDailyReportToSupabase(report: DailyCrimeReport): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('daily_crime_reports').upsert([report], { onConflict: 'id' });
    if (error) {
      console.error('Error saving daily report to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

