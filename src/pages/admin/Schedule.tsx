
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeSlot, Professional } from '@/types/types';
import { format, parseISO, set } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  fetchProfessionals,
  fetchAllSlotsForProfessional,
  createAvailableSlot,
  deleteAvailableSlot
} from '@/services/api';

const Schedule = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Add time slot form state
  const [startHour, setStartHour] = useState('09');
  const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('10');
  const [endMinute, setEndMinute] = useState('00');
  
  // Fetch professionals
  const { data: professionals = [], isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ['professionals'],
    queryFn: fetchProfessionals
  });
  
  // Fetch time slots for the selected professional and date
  const { 
    data: timeSlots = [], 
    isLoading: isLoadingTimeSlots,
    refetch: refetchTimeSlots
  } = useQuery({
    queryKey: ['professionalTimeSlots', selectedProfessionalId, selectedDate],
    queryFn: () => selectedProfessionalId && selectedDate 
      ? fetchAllSlotsForProfessional(selectedProfessionalId)
      : Promise.resolve([]),
    enabled: !!selectedProfessionalId && !!selectedDate
  });
  
  // Create time slot mutation
  const createSlotMutation = useMutation({
    mutationFn: ({ professionalId, startTime, endTime }: { 
      professionalId: string, 
      startTime: Date, 
      endTime: Date 
    }) => createAvailableSlot(professionalId, startTime, endTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalTimeSlots'] });
      toast.success('Horário adicionado com sucesso');
      setIsAddDialogOpen(false);
      refetchTimeSlots();
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar horário: ${error.message}`);
    }
  });
  
  // Delete time slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: (id: string) => deleteAvailableSlot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalTimeSlots'] });
      toast.success('Horário removido com sucesso');
      setIsDeleteDialogOpen(false);
      refetchTimeSlots();
    },
    onError: (error) => {
      toast.error(`Erro ao remover horário: ${error.message}`);
    }
  });
  
  const handleCreateTimeSlot = () => {
    if (!selectedProfessionalId || !selectedDate) {
      toast.error('Selecione um profissional e uma data');
      return;
    }
    
    const startTimeDate = set(selectedDate, {
      hours: parseInt(startHour),
      minutes: parseInt(startMinute),
      seconds: 0,
      milliseconds: 0
    });
    
    const endTimeDate = set(selectedDate, {
      hours: parseInt(endHour),
      minutes: parseInt(endMinute),
      seconds: 0,
      milliseconds: 0
    });
    
    if (endTimeDate <= startTimeDate) {
      toast.error('O horário de término deve ser posterior ao horário de início');
      return;
    }
    
    createSlotMutation.mutate({
      professionalId: selectedProfessionalId,
      startTime: startTimeDate,
      endTime: endTimeDate
    });
  };
  
  const handleDeleteTimeSlot = () => {
    if (!selectedTimeSlot) return;
    
    deleteSlotMutation.mutate(selectedTimeSlot.id);
  };
  
  const openDeleteDialog = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setIsDeleteDialogOpen(true);
  };
  
  // Filter slots for the selected date
  const filteredTimeSlots = timeSlots.filter(slot => {
    if (!slot.start_time || !selectedDate) return false;
    
    const slotDate = new Date(slot.start_time);
    return slotDate.toDateString() === selectedDate.toDateString();
  });
  
  // Generate hour options
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return { value: hour, label: hour };
  });
  
  // Generate minute options (0, 15, 30, 45)
  const minuteOptions = [
    { value: '00', label: '00' },
    { value: '15', label: '15' },
    { value: '30', label: '30' },
    { value: '45', label: '45' }
  ];
  
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gerenciar Horários</h1>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Adicionar Horário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Horário Disponível</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="professional">Profissional*</Label>
                  <Select 
                    value={selectedProfessionalId} 
                    onValueChange={setSelectedProfessionalId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((professional) => (
                        <SelectItem key={professional.id} value={professional.id}>
                          {professional.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Data*</Label>
                  <div className="border rounded-md p-2">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="mx-auto"
                      locale={ptBR}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Horário de Início*</Label>
                    <div className="flex space-x-2">
                      <Select value={startHour} onValueChange={setStartHour}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {hourOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={startMinute} onValueChange={setStartMinute}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Minuto" />
                        </SelectTrigger>
                        <SelectContent>
                          {minuteOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Horário de Término*</Label>
                    <div className="flex space-x-2">
                      <Select value={endHour} onValueChange={setEndHour}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {hourOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={endMinute} onValueChange={setEndMinute}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Minuto" />
                        </SelectTrigger>
                        <SelectContent>
                          {minuteOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button 
                  onClick={handleCreateTimeSlot}
                  disabled={createSlotMutation.isPending}
                >
                  {createSlotMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-professional">Profissional</Label>
                  <Select 
                    value={selectedProfessionalId} 
                    onValueChange={setSelectedProfessionalId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((professional) => (
                        <SelectItem key={professional.id} value={professional.id}>
                          {professional.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Data</Label>
                  <div className="border rounded-md p-2">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="mx-auto"
                      locale={ptBR}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Horários Disponíveis</CardTitle>
              <CardDescription>
                {selectedDate ? (
                  <span>
                    {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                ) : 'Selecione uma data'}
                {selectedProfessionalId && (
                  <span> - {professionals.find(p => p.id === selectedProfessionalId)?.name}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedProfessionalId || !selectedDate ? (
                <div className="text-center py-8 text-muted-foreground">
                  Selecione um profissional e uma data para visualizar os horários.
                </div>
              ) : isLoadingTimeSlots ? (
                <div className="text-center py-8">Carregando horários...</div>
              ) : filteredTimeSlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum horário disponível para a data selecionada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Início</TableHead>
                      <TableHead>Término</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTimeSlots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>
                          {slot.start_time && format(new Date(slot.start_time), 'HH:mm')}
                        </TableCell>
                        <TableCell>
                          {slot.end_time && format(new Date(slot.end_time), 'HH:mm')}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            slot.available 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {slot.available ? 'Disponível' : 'Ocupado'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => openDeleteDialog(slot)}
                            disabled={!slot.available}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Tem certeza que deseja remover este horário?
            </p>
            {selectedTimeSlot && selectedTimeSlot.start_time && selectedTimeSlot.end_time && (
              <p className="font-medium mt-2">
                {format(new Date(selectedTimeSlot.start_time), 'dd/MM/yyyy HH:mm')} - 
                {format(new Date(selectedTimeSlot.end_time), ' HH:mm')}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDeleteTimeSlot}
              disabled={deleteSlotMutation.isPending}
            >
              {deleteSlotMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Schedule;
