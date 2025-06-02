
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from "@/hooks/use-toast";
import { authAPI } from '@/services/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserViewMode = 'table' | 'detail';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar?: string;
  profile_picture_data?: string;
  username: string;
}

interface NewUserForm {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'teacher' | 'admin' | 'administration';
  profile_picture?: string;
}

const Users: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<UserViewMode>('table');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'student',
    profile_picture: ''
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await authAPI.getAllUsers();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load users. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);

  useEffect(() => {
    // Filter users based on search query
    if (users.length > 0) {
      const filtered = users.filter((u) => {
        const searchLower = searchQuery.toLowerCase();
        const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
        return (
          fullName.includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.role.toLowerCase().includes(searchLower)
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('table');
    setSelectedUser(null);
  };

  const handleAction = async (action: string, userId: string) => {
    try {
      if (action === 'Edit') {
        // Navigate to edit page or open modal
        toast({
          title: 'Edit User',
          description: 'Edit functionality will be implemented soon.',
        });
      } else if (action === 'Delete') {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
          await authAPI.deleteUser(userId);
          toast({
            title: 'Success',
            description: 'User deleted successfully.',
          });
          
          // Refresh the users list
          const data = await authAPI.getAllUsers();
          setUsers(data);
          setFilteredUsers(data);
          
          // If in detail view, go back to list view
          if (viewMode === 'detail') {
            handleBackToList();
          }
        }
      }
    } catch (error) {
      console.error(`Failed to ${action.toLowerCase()} user:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action.toLowerCase()} user. Please try again.`,
        variant: 'destructive',
      });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRoleChange = (value: string) => {
    setNewUser(prev => ({ 
      ...prev, 
      role: value as 'student' | 'teacher' | 'admin' | 'administration' 
    }));
  };
  
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Process profile picture if provided
      if (profilePicture) {
        const reader = new FileReader();
        const base64Image = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.readAsDataURL(profilePicture);
        });
        
        // Set the profile picture in the user data
        newUser.profile_picture = base64Image;
      }
      
      await authAPI.createUser(newUser);
      
      toast({
        title: 'Success',
        description: 'User created successfully.',
      });
      
      // Reset form and close dialog
      setNewUser({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'student',
        profile_picture: ''
      });
      setProfilePicture(null);
      setIsDialogOpen(false);
      
      // Refresh the users list
      const data = await authAPI.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Failed to create user:', error);
      toast({
        title: 'Error',
        description: 'Failed to create user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'administration') {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            View and manage all users in the system.
          </p>
        </div>
        
        {viewMode === 'table' ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  A list of all users in the system.
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex w-full max-w-sm items-center space-x-2 md:w-80">
                  <Input
                    type="search"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="md:min-w-64"
                  />
                  <Button type="submit" variant="secondary" size="icon">
                    <Search className="h-4 w-4" />
                    <span className="sr-only">Search</span>
                  </Button>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account. The user will receive an email with login instructions.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="username" className="text-right">
                            Username
                          </Label>
                          <Input
                            id="username"
                            name="username"
                            value={newUser.username}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">
                            Email
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={newUser.email}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="password" className="text-right">
                            Password
                          </Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            value={newUser.password}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="first_name" className="text-right">
                            First Name
                          </Label>
                          <Input
                            id="first_name"
                            name="first_name"
                            value={newUser.first_name}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="last_name" className="text-right">
                            Last Name
                          </Label>
                          <Input
                            id="last_name"
                            name="last_name"
                            value={newUser.last_name}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="role" className="text-right">
                            Role
                          </Label>
                          <Select 
                            value={newUser.role} 
                            onValueChange={handleRoleChange}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="teacher">Teacher</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="administration">Administration</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="profile_picture" className="text-right">
                            Profile Picture
                          </Label>
                          <Input
                            id="profile_picture"
                            name="profile_picture"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setProfilePicture(file);
                              }
                            }}
                            className="col-span-3"
                          />
                        </div>
                        {profilePicture && (
                          <div className="grid grid-cols-4 items-center gap-4">
                            <div className="col-start-2 col-span-3">
                              <div className="w-16 h-16 rounded-full overflow-hidden">
                                <img 
                                  src={URL.createObjectURL(profilePicture)} 
                                  alt="Profile preview" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? 'Creating...' : 'Create User'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Avatar className="h-10 w-10">
                              {user.profile_picture_data ? (
                                <AvatarImage src={user.profile_picture_data} alt={`${user.first_name} ${user.last_name}`} />
                              ) : user.avatar ? (
                                <AvatarImage src={user.avatar} alt={`${user.first_name} ${user.last_name}`} />
                              ) : (
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {user.role === 'administration' ? 'AD' : user.first_name.charAt(0)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </div>
                        </TableCell>
                        <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className="capitalize">{user.role}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Details</CardTitle>
                <CardDescription>
                  Detailed information about the selected user.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleBackToList}>
                Back to List
              </Button>
            </CardHeader>
            <CardContent>
              {selectedUser && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    {selectedUser.profile_picture_data ? (
                      <img 
                        src={selectedUser.profile_picture_data} 
                        alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : selectedUser.avatar ? (
                      <img 
                        src={selectedUser.avatar} 
                        alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl">
                        {selectedUser.first_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold">{`${selectedUser.first_name} ${selectedUser.last_name}`}</h2>
                      <p className="text-sm text-muted-foreground capitalize">{selectedUser.role}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Contact Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-muted-foreground">Email:</span>
                          <span>{selectedUser.email}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-muted-foreground">Username:</span>
                          <span>{selectedUser.username}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-muted-foreground">User ID:</span>
                          <span>{selectedUser.id}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Account Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-muted-foreground">Role:</span>
                          <span className="capitalize">{selectedUser.role}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="text-green-500">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 justify-end">
                    <Button variant="outline" onClick={() => handleAction('Edit', selectedUser.id)}>
                      Edit User
                    </Button>
                    <Button variant="destructive" onClick={() => handleAction('Delete', selectedUser.id)}>
                      Delete User
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Users;
