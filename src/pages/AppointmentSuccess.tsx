import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Calendar, Clock, User, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAppointmentById } from '@/services/api';
import { Appointment } from '@/types/types';
import NavBar from '@/components/NavBar';
import { toast } from 'sonner';

const AppointmentSuccess = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadAppointment = async () => {
      setLoading(true);
      try {
        const data = await fetchAppointmentById(id);
        if (!data) {
          setLoading(false);
          setError('Agendamento não encontrado.');
        } else {
          console.log('Appointment loaded successfully:', data);
          
          const typedData = {
            ...data,
            status: data.status as 'confirmed' | 'cancelled' | 'completed',
            slots: {
              ...data.slots,
              time: data.slots?.time || '',
              available: data.slots?.is_available || false
            }
          };
          
          setAppointment(typedData as Appointment);
        }
      } catch (err: any) {
        console.error('Error loading appointment:', err);
        setLoading(false);
        setError(`Erro ao carregar agendamento: ${err.message}`);
      }
    };

    if (id) {
      loadAppointment();
    } else {
      setLoading(false);
      setError('ID do agendamento não fornecido.');
    }
  }, [id]);
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data não disponível';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      weekday: 'long'
    }).format(date);
  };
  
  const formatTime = (dateString?: string) => {
    if (!dateString) return 'Horário não disponível';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const shouldShowPrice = appointment?.services?.price && appointment.services.price > 0;
  const shouldShowDuration = appointment?.services?.duration && appointment.services.duration > 0;
  
  if (loading) {
    return (
      <>
        <NavBar />
        <div className="container max-w-md mx-auto py-10 px-4">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        </div>
      </>
    );
  }
  
  if (error) {
    return (
      <>
        <NavBar />
        <div className="container max-w-md mx-auto py-10 px-4">
          <div className="text-center space-y-4">
            <div className="rounded-full bg-red-100 p-3 w-12 h-12 mx-auto flex items-center justify-center">
              <Clipboard className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-600">{error}</h1>
            <p className="text-muted-foreground">
              Não conseguimos encontrar os detalhes do seu agendamento.
            </p>
            <Button asChild className="mt-4">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o início
              </Link>
            </Button>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <NavBar />
      <div className="container max-w-md mx-auto py-10 px-4">
        <div className="text-center mb-6">
          <div className="rounded-full bg-green-100 p-3 w-16 h-16 mx-auto flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mt-4">Agendamento Confirmado!</h1>
          <p className="text-muted-foreground">
            Seu agendamento foi realizado com sucesso.
          </p>
        </div>
        
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold">Detalhes do Agendamento</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="rounded-full p-2 bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium capitalize">
                  {appointment?.appointment_date 
                    ? formatDate(appointment.appointment_date) 
                    : formatDate(appointment?.slots?.start_time)}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="rounded-full p-2 bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horário</p>
                <p className="font-medium">
                  {appointment?.appointment_date 
                    ? formatTime(appointment.appointment_date) 
                    : formatTime(appointment?.slots?.start_time)}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="rounded-full p-2 bg-primary/10">
                <Clipboard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Serviço</p>
                <p className="font-medium">{appointment?.services?.name || 'Serviço não especificado'}</p>
                {appointment?.services && (shouldShowDuration || shouldShowPrice) && (
                  <p className="text-sm text-muted-foreground">
                    {shouldShowDuration && `${appointment.services.duration} minutos`}
                    {shouldShowDuration && shouldShowPrice && ' • '}
                    {shouldShowPrice && `R$ ${appointment.services.price.toFixed(2).replace('.', ',')}`}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="rounded-full p-2 bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profissional</p>
                <p className="font-medium">{appointment?.professionals?.name || 'Profissional não especificado'}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o início
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default AppointmentSuccess;
