import { supabase } from "@/integrations/supabase/client";
import { Professional, Service, TimeSlot } from "@/types/types";

// Fetch all active professionals
export const fetchProfessionals = async (): Promise<Professional[]> => {
  console.log("Fetching professionals...");
  try {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('active', true);
    
    if (error) {
      console.error('Error fetching professionals:', error);
      throw error;
    }
    
    console.log("Professionals data:", data);
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching professionals:', err);
    throw err;
  }
};

// Fetch services for a specific professional
export const fetchProfessionalServices = async (professionalId: string): Promise<Service[]> => {
  console.log(`Fetching services for professional ${professionalId}...`);
  try {
    const { data, error } = await supabase
      .from('professional_services')
      .select('service_id')
      .eq('professional_id', professionalId);
    
    if (error) {
      console.error('Error fetching professional services:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    const serviceIds = data.map(item => item.service_id);
    console.log(`Found service IDs:`, serviceIds);
    
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .in('id', serviceIds)
      .eq('active', true);
    
    if (servicesError) {
      console.error('Error fetching services:', servicesError);
      throw servicesError;
    }
    
    console.log(`Retrieved services:`, services);
    return services || [];
  } catch (err) {
    console.error('Unexpected error fetching professional services:', err);
    throw err;
  }
};

// Fetch available time slots for a professional on a specific date
export const fetchAvailableSlots = async (professionalId: string, date: Date): Promise<TimeSlot[]> => {
  console.log(`Fetching slots for professional ${professionalId} on date ${date}...`);
  try {
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const { data, error } = await supabase
      .from('available_slots')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_available', true)
      .gte('start_time', selectedDate.toISOString())
      .lt('start_time', nextDay.toISOString())
      .order('start_time');
    
    if (error) {
      console.error('Error fetching available slots:', error);
      throw error;
    }
    
    const slots = (data || []).map(slot => ({
      id: slot.id,
      time: new Date(slot.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      available: slot.is_available,
      start_time: slot.start_time,
      end_time: slot.end_time
    }));
    
    console.log(`Retrieved ${slots.length} available slots`);
    return slots;
  } catch (err) {
    console.error('Unexpected error fetching available slots:', err);
    throw err;
  }
};

// Create a new appointment
export const createAppointment = async (
  professionalId: string,
  serviceId: string,
  slotId: string,
  clientName: string,
  clientPhone: string
): Promise<{ success: boolean; appointmentId?: string; error?: any }> => {
  console.log(`Creating appointment for professional ${professionalId}, service ${serviceId}, slot ${slotId}...`);
  try {
    // First update slot availability
    const { error: slotError } = await supabase
      .from('available_slots')
      .update({ is_available: false })
      .eq('id', slotId);
    
    if (slotError) {
      console.error('Error updating slot availability:', slotError);
      return { success: false, error: slotError };
    }
    
    // Then create the appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert([
        {
          professional_id: professionalId,
          service_id: serviceId,
          slot_id: slotId,
          client_name: clientName,
          client_phone: clientPhone,
          status: 'confirmed'
        }
      ])
      .select();
    
    if (error) {
      console.error('Error creating appointment:', error);
      // Revert slot availability change on error
      await supabase
        .from('available_slots')
        .update({ is_available: true })
        .eq('id', slotId);
      
      return { success: false, error };
    }
    
    console.log(`Appointment created successfully:`, data?.[0]);
    return {
      success: true,
      appointmentId: data?.[0]?.id
    };
  } catch (err) {
    console.error('Unexpected error creating appointment:', err);
    return { success: false, error: err };
  }
};

// Admin API functions

// Create a new professional
export const createProfessional = async (professional: Omit<Professional, 'id'>): Promise<{ success: boolean; id?: string; error?: any }> => {
  console.log("Creating professional:", professional);
  try {
    const { data, error } = await supabase
      .from('professionals')
      .insert([{
        name: professional.name,
        phone: professional.phone || null,
        bio: professional.bio || null,
        photo_url: professional.photo_url || null,
        active: professional.active !== undefined ? professional.active : true,
        user_id: professional.user_id || null
      }])
      .select();
    
    if (error) {
      console.error('Error creating professional:', error);
      return { success: false, error };
    }
    
    console.log("Professional created:", data);
    return {
      success: true,
      id: data?.[0]?.id
    };
  } catch (err) {
    console.error('Unexpected error creating professional:', err);
    return { success: false, error: err };
  }
};

// Update a professional
export const updateProfessional = async (id: string, professional: Partial<Professional>): Promise<boolean> => {
  console.log(`Updating professional ${id}:`, professional);
  try {
    const { error } = await supabase
      .from('professionals')
      .update(professional)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating professional:', error);
      return false;
    }
    
    console.log("Professional updated successfully");
    return true;
  } catch (err) {
    console.error('Unexpected error updating professional:', err);
    return false;
  }
};

// Delete a professional
export const deleteProfessional = async (id: string): Promise<boolean> => {
  console.log(`Deleting professional ${id}...`);
  try {
    const { error } = await supabase
      .from('professionals')
      .update({ active: false })
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting professional:', error);
      return false;
    }
    
    console.log("Professional deleted successfully");
    return true;
  } catch (err) {
    console.error('Unexpected error deleting professional:', err);
    return false;
  }
};

// Fetch all services
export const fetchServices = async (): Promise<Service[]> => {
  console.log("Fetching services...");
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true);
    
    if (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} services`);
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching services:', err);
    throw err;
  }
};

// Create a new service
export const createService = async (service: Omit<Service, 'id'>): Promise<{ success: boolean; id?: string; error?: any }> => {
  console.log("Creating service:", service);
  try {
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select();
    
    if (error) {
      console.error('Error creating service:', error);
      return { success: false, error };
    }
    
    console.log("Service created:", data);
    return {
      success: true,
      id: data?.[0]?.id
    };
  } catch (err) {
    console.error('Unexpected error creating service:', err);
    return { success: false, error: err };
  }
};

// Update a service
export const updateService = async (id: string, service: Partial<Service>): Promise<boolean> => {
  const { error } = await supabase
    .from('services')
    .update(service)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating service:', error);
    return false;
  }
  
  return true;
};

// Delete a service
export const deleteService = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('services')
    .update({ active: false })
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting service:', error);
    return false;
  }
  
  return true;
};

// Associate a service with a professional
export const associateProfessionalService = async (professionalId: string, serviceId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('professional_services')
    .insert([{ professional_id: professionalId, service_id: serviceId }]);
  
  if (error) {
    if (error.code === '23505') {
      return true;
    }
    console.error('Error associating service with professional:', error);
    return false;
  }
  
  return true;
};

// Remove a service association from a professional
export const dissociateProfessionalService = async (professionalId: string, serviceId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('professional_services')
    .delete()
    .eq('professional_id', professionalId)
    .eq('service_id', serviceId);
  
  if (error) {
    console.error('Error removing service from professional:', error);
    return false;
  }
  
  return true;
};

// Create available time slots for a professional
export const createAvailableSlot = async (
  professionalId: string,
  startTime: Date,
  endTime: Date
): Promise<{ success: boolean; id?: string; error?: any }> => {
  console.log(`Creating slot for professional ${professionalId} from ${startTime} to ${endTime}...`);
  try {
    const { data, error } = await supabase
      .from('available_slots')
      .insert([{
        professional_id: professionalId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_available: true
      }])
      .select();
    
    if (error) {
      console.error('Error creating available slot:', error);
      return { success: false, error };
    }
    
    console.log("Available slot created:", data);
    return {
      success: true,
      id: data?.[0]?.id
    };
  } catch (err) {
    console.error('Unexpected error creating available slot:', err);
    return { success: false, error: err };
  }
};

// Fetch all available slots for a professional (for admin)
export const fetchAllSlotsForProfessional = async (professionalId: string): Promise<TimeSlot[]> => {
  const { data, error } = await supabase
    .from('available_slots')
    .select('*')
    .eq('professional_id', professionalId)
    .order('start_time');
  
  if (error) {
    console.error('Error fetching professional slots:', error);
    throw error;
  }
  
  return (data || []).map(slot => ({
    id: slot.id,
    time: new Date(slot.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    available: slot.is_available,
    start_time: slot.start_time,
    end_time: slot.end_time
  }));
};

// Delete an available time slot
export const deleteAvailableSlot = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('available_slots')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting available slot:', error);
    return false;
  }
  
  return true;
};

// Fetch all appointments (for admin)
export const fetchAppointments = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      professionals:professional_id (name),
      services:service_id (name, duration, price),
      slots:slot_id (start_time, end_time)
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
  
  return data || [];
};

// Fetch appointments for a specific professional
export const fetchProfessionalAppointments = async (professionalId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      services:service_id (name, duration, price),
      slots:slot_id (start_time, end_time)
    `)
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching professional appointments:', error);
    throw error;
  }
  
  return data || [];
};

// Update appointment status
export const updateAppointmentStatus = async (id: string, status: 'confirmed' | 'cancelled' | 'completed'): Promise<boolean> => {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating appointment status:', error);
    return false;
  }
  
  return true;
};
