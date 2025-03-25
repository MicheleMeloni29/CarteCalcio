import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
    user: string | null;
    login: (userToken: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<string | null>(null);

    useEffect(() => {
        // Recupera il token salvato
        const loadUser = async () => {
            const storedUser = await AsyncStorage.getItem('userToken');
            setUser(storedUser);
        };
        loadUser();
    }, []);

    const login = async (userToken: string) => {
        setUser(userToken);
        await AsyncStorage.setItem('userToken', userToken);
    };

    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem('userToken');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
