
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Building, Edit, Trash, Link as LinkIcon, Copy, Eye, AlertCircle, Calendar } from 'lucide-react';
import { Company } from '@/types/webhook';

const CompaniesPage = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#663399');
  const [secondaryColor, setSecondaryColor] = useState('#FFA500');
  const [slug, setSlug] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Plan management
  const [planType, setPlanType] = useState('basic');
  const [planValue, setPlanValue] = useState('0');
  const [planExpiryDate, setPlanExpiryDate] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }
        
        const { data: userData, error } = await supabase
          .from('users')
          .select('tipo_usuario')
          .eq('auth_id', session.user.id)
          .single();
        
        if (error || !userData || userData.tipo_usuario !== 'superadmin') {
          navigate('/admin/dashboard');
          return;
        }
        
        fetchCompanies();
      } catch (error) {
        console.error('Error checking access:', error);
        navigate('/login');
      }
    };
    
    checkAccess();
  }, [navigate]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      setCompanies(data as Company[]);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (company: Company | null = null) => {
    if (company) {
      setEditingCompany(company);
      setName(company.name);
      setPrimaryColor(company.primary_color || '#663399');
      setSecondaryColor(company.secondary_color || '#FFA500');
      setSlug(company.slug);
    } else {
      setEditingCompany(null);
      setName('');
      setPrimaryColor('#663399');
      setSecondaryColor('#FFA500');
      setSlug('');
    }
    
    setIsDialogOpen(true);
  };

  const handleOpenPlanDialog = (company: Company) => {
    setEditingCompany(company);
    setPlanType(company.plan || 'basic');
    setPlanValue(company.plan_value?.toString() || '0');
    setPlanExpiryDate(company.plan_expiry_date?.split('T')[0] || '');
    setIsPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!editingCompany) return;
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          plan: planType,
          plan_value: parseFloat(planValue),
          plan_expiry_date: planExpiryDate ? new Date(planExpiryDate).toISOString() : null,
          is_active: new Date(planExpiryDate) > new Date() || !planExpiryDate
        })
        .eq('id', editingCompany.id);
      
      if (error) throw error;
      
      toast.success('Plano atualizado com sucesso');
      setIsPlanDialogOpen(false);
      fetchCompanies();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      toast.error(`Erro ao salvar plano: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!name || !slug) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    // Simple slug validation (lowercase, no spaces, only letters, numbers, and hyphens)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      toast.error('O slug deve conter apenas letras minúsculas, números e hífens');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Check if slug is unique when creating a new company
      if (!editingCompany) {
        const { data, error } = await supabase
          .from('companies')
          .select('id')
          .eq('slug', slug)
          .single();
        
        if (data) {
          toast.error('Este slug já está em uso. Por favor, escolha outro.');
          setIsSaving(false);
          return;
        }
      } else if (editingCompany.slug !== slug) {
        // Check if slug is unique when changing the slug of an existing company
        const { data, error } = await supabase
          .from('companies')
          .select('id')
          .eq('slug', slug)
          .single();
        
        if (data && data.id !== editingCompany.id) {
          toast.error('Este slug já está em uso. Por favor, escolha outro.');
          setIsSaving(false);
          return;
        }
      }
      
      const companyData = {
        name,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        slug,
        is_active: true
      };
      
      let result;
      
      if (editingCompany) {
        // Update existing company
        result = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', editingCompany.id);
      } else {
        // Create new company
        result = await supabase
          .from('companies')
          .insert([companyData]);
      }
      
      if (result.error) throw result.error;
      
      toast.success(editingCompany ? 'Empresa atualizada com sucesso' : 'Empresa criada com sucesso');
      setIsDialogOpen(false);
      fetchCompanies();
    } catch (error: any) {
      console.error('Error saving company:', error);
      toast.error(`Erro ao salvar empresa: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Tem certeza que deseja excluir a empresa "${company.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);
      
      if (error) throw error;
      
      toast.success('Empresa excluída com sucesso');
      fetchCompanies();
    } catch (error: any) {
      console.error('Error deleting company:', error);
      toast.error(`Erro ao excluir empresa: ${error.message}`);
    }
  };

  const copyPublicUrl = (slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência');
  };

  const generateSlug = () => {
    if (name) {
      const newSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      
      setSlug(newSlug);
    }
  };

  const isCompanyActive = (company: Company) => {
    if (!company.plan_expiry_date) return true;
    return new Date(company.plan_expiry_date) > new Date();
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gerenciar Empresas</h1>
          <Button onClick={() => handleOpenDialog()}>
            Adicionar Empresa
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">Carregando empresas...</div>
        ) : companies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-medium mb-2">Nenhuma empresa cadastrada</p>
              <p className="text-muted-foreground mb-6">Adicione sua primeira empresa para começar</p>
              <Button onClick={() => handleOpenDialog()}>
                Adicionar Empresa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Empresas</CardTitle>
              <CardDescription>
                Gerencie todas as empresas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cores</TableHead>
                    <TableHead>Link Público</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.slug}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium capitalize">{company.plan || 'Básico'}</span>
                          {company.plan_value ? (
                            <span className="text-xs text-muted-foreground">
                              R$ {company.plan_value.toFixed(2).replace('.', ',')}
                            </span>
                          ) : null}
                          {company.plan_expiry_date && (
                            <span className="text-xs text-muted-foreground">
                              Expira: {new Date(company.plan_expiry_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCompanyActive(company) ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Expirado
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <div 
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: company.primary_color || '#663399' }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: company.secondary_color || '#FFA500' }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => copyPublicUrl(company.slug)}>
                          <LinkIcon className="h-4 w-4 mr-1" />
                          /{company.slug}
                          <Copy className="h-3 w-3 ml-1" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/${company.slug}`, '_blank')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenPlanDialog(company)}>
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(company)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCompany(company)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Create/Edit Company Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Editar Empresa' : 'Adicionar Empresa'}
            </DialogTitle>
            <DialogDescription>
              {editingCompany 
                ? 'Edite os detalhes da empresa selecionada.' 
                : 'Preencha os detalhes para criar uma nova empresa.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Salão Beleza Total"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">Slug da Empresa (URL) *</Label>
              <div className="flex space-x-2">
                <Input 
                  id="slug" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Ex: salao-beleza-total"
                />
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={generateSlug}
                  disabled={!name}
                >
                  Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                URL pública: {window.location.origin}/{slug || 'sua-empresa'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex space-x-2">
                  <div 
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <Input 
                    id="primaryColor" 
                    type="color"
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Cor Secundária</Label>
                <div className="flex space-x-2">
                  <div 
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: secondaryColor }}
                  />
                  <Input 
                    id="secondaryColor" 
                    type="color"
                    value={secondaryColor} 
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              onClick={handleSaveCompany} 
              disabled={isSaving || !name || !slug}
            >
              {isSaving ? 'Salvando...' : editingCompany ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Plan Management Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Gerenciar Plano
            </DialogTitle>
            <DialogDescription>
              Configure o plano e a data de validade para {editingCompany?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="planType">Tipo de Plano</Label>
              <select
                id="planType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={planType}
                onChange={(e) => setPlanType(e.target.value)}
              >
                <option value="basic">Básico</option>
                <option value="standard">Padrão</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Empresarial</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="planValue">Valor do Plano (R$)</Label>
              <Input 
                id="planValue" 
                type="number"
                value={planValue} 
                onChange={(e) => setPlanValue(e.target.value)}
                placeholder="99.90"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="planExpiryDate">Data de Expiração</Label>
              <Input 
                id="planExpiryDate" 
                type="date"
                value={planExpiryDate} 
                onChange={(e) => setPlanExpiryDate(e.target.value)}
              />
              {planExpiryDate && (
                <p className="text-xs text-muted-foreground">
                  O plano {new Date(planExpiryDate) > new Date() ? 'expirará' : 'expirou'} em {new Date(planExpiryDate).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            
            {editingCompany && editingCompany.plan_expiry_date && new Date(editingCompany.plan_expiry_date) < new Date() && (
              <div className="rounded-md bg-amber-50 p-4 mt-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Plano Expirado</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        O plano desta empresa já expirou. Os usuários não conseguirão acessar o sistema até que a data de expiração seja atualizada.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              onClick={handleSavePlan} 
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CompaniesPage;
