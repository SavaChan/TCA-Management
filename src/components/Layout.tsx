import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Calendar, 
  Settings, 
  BarChart3, 
  LogOut,
  User,
  Euro,
  UserPlus,
  AlertTriangle,
  Receipt,
  GraduationCap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Layout = () => {
  const { isAuthenticated, profile, signOut, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Errore",
        description: "Errore durante il logout",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Arrivederci",
        description: "Logout effettuato con successo",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-2xl font-bold text-primary">Tennis Club Manager</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm">{profile?.nome}</span>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <nav className="mb-6">
          <div className="flex space-x-4">
            <Button asChild variant={location.pathname === '/soci' ? 'default' : 'outline'} className="flex items-center space-x-2">
              <Link to="/soci">
                <Users className="h-4 w-4" />
                <span>Soci</span>
              </Link>
            </Button>
            <Button asChild variant={location.pathname === '/ospiti' ? 'default' : 'outline'} className="flex items-center space-x-2">
              <Link to="/ospiti">
                <UserPlus className="h-4 w-4" />
                <span>Ospiti</span>
              </Link>
            </Button>
            <Button asChild variant={location.pathname === '/prenotazioni' ? 'default' : 'outline'} className="flex items-center space-x-2">
              <Link to="/prenotazioni">
                <Calendar className="h-4 w-4" />
                <span>Prenotazioni</span>
              </Link>
            </Button>
            <Button asChild variant={location.pathname === '/report' ? 'default' : 'outline'} className="flex items-center space-x-2">
              <Link to="/report">
                <BarChart3 className="h-4 w-4" />
                <span>Report</span>
              </Link>
            </Button>
            <Button asChild variant={location.pathname === '/insoluti' ? 'default' : 'outline'} className="flex items-center space-x-2">
              <Link to="/insoluti">
                <AlertTriangle className="h-4 w-4" />
                <span>Insoluti</span>
              </Link>
            </Button>
            <Button asChild variant={location.pathname === '/finanze' ? 'default' : 'outline'} className="flex items-center space-x-2">
              <Link to="/finanze">
                <Euro className="h-4 w-4" />
                <span>Finanze</span>
              </Link>
            </Button>
            <Button asChild variant={location.pathname === '/iva-ospiti' ? 'default' : 'outline'} className="flex items-center space-x-2">
              <Link to="/iva-ospiti">
                <Receipt className="h-4 w-4" />
                <span>IVA Ospiti</span>
              </Link>
            </Button>
            <Button asChild variant={location.pathname === '/maestri' ? 'default' : 'outline'} className="flex items-center space-x-2">
              <Link to="/maestri">
                <GraduationCap className="h-4 w-4" />
                <span>Maestri</span>
              </Link>
            </Button>
            <Button asChild variant={location.pathname === '/tariffe' ? 'default' : 'outline'} className="flex items-center space-x-2">
              <Link to="/tariffe">
                <Settings className="h-4 w-4" />
                <span>Tariffe</span>
              </Link>
            </Button>
          </div>
        </nav>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;