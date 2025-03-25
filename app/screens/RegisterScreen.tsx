import React, { useState, useEffect } from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigators/MainTabNavigator';

type RegisterScreenProps = StackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(true);

    const API_URL =
        "https://34ed-2a01-e11-9002-1af0-89fe-ad2-8cc6-73b1.ngrok-free.app";

    // Email validation
    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
     };

    // Check validity form
    useEffect(() => {
        if (userName && email && password && confirmPassword && password === confirmPassword && isValidEmail(email)) {
            setIsFormValid(true);
            setErrorMessage('');
        } else {
            setIsFormValid(false);
            if (!isValidEmail(email)) {
                setErrorMessage('Inserisci un indirizzo email valido.');
            } else if (password !== confirmPassword) {
                setErrorMessage('Le password non coincidono.');
            } else {
                setErrorMessage('');
            }
        }
    }, [userName, email, password, confirmPassword]);

    const handleRegister = async () => {
        if (!isFormValid) {
            Alert.alert('Errore', 'Assicurati che tutti i campi siano compilati e le password coincidano.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: userName,
                    email: email,
                    password: password,
                    confirm_Password: confirmPassword,
                }),
            });

            console.log('Repsonse status:', response.status);
            const data = await response.json();
            console.log('Response Data:', data);

            if (response.ok) {
                console.log('User registered:', data);
                Alert.alert('Registrazione completata', 'Ora puoi effettuare il login.', [
                    { text: 'OK', onPress: () => navigation.navigate('Login') },
                ]);
                navigation.navigate('Login');
            } else {
                console.error('Registration failed:', data);
                setErrorMessage(data.username ? 'Username già in uso. Scegline un altro.' : 'Errore di registrazione. Riprova.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setErrorMessage('Errore di rete. Riprova.');
        }
    };

    return (
        <ImageBackground
            source={require('../../assets/images/loginBackground.webp')}
            style={styles.background}
            imageStyle={{ opacity: 0.7 }}
        >
            <View style={styles.overlay}>
                <Text style={styles.introText}>Register as a new user</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        placeholderTextColor="#B0B0B0"
                        value={userName}
                        onChangeText={setUserName}
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#B0B0B0"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType='email-address'
                    />
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.inputPassword}
                            placeholder="Password"
                            placeholderTextColor="#B0B0B0"
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize="none"
                            secureTextEntry={isPasswordVisible}
                        />
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                            <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={24} color="#6EC1E4" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.inputPassword}
                            placeholder="Confirm Password"
                            placeholderTextColor="#B0B0B0"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            autoCapitalize="none"
                            secureTextEntry={isPasswordVisible}
                        />
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                            <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={24} color="#6EC1E4" />
                        </TouchableOpacity>
                    </View>

                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            isFormValid ? styles.buttonEnabled : styles.buttonDisabled
                        ]}
                        onPress={handleRegister}
                        disabled={!isFormValid}
                    >
                        <Text style={styles.buttonText}>Register</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
    );
};

export default RegisterScreen;

const styles = StyleSheet.create({
    background: {
        flex: 1,
        justifyContent: 'center',
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Overlay scuro per migliorare leggibilità
        alignItems: 'center',
    },
    introText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '300',
        textAlign: 'center',
    },
    inputContainer: {
        width: '100%',
        marginTop: 20,
    },
    input: {
        height: 45,
        borderColor: '#6EC1E4',
        borderWidth: 1,
        marginBottom: 12,
        paddingLeft: 12,
        borderRadius: 10,
        backgroundColor: '#fff',
        color: '#333',
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#6EC1E4',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 12,
        paddingLeft: 12,
        paddingRight: 12,
        backgroundColor: '#fff',
    },
    inputPassword: {
        flex: 1,
        height: 45,
        fontSize: 16,
        color: '#333',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 12,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginVertical: 5,
        width: '100%',
    },
    buttonEnabled: {
        backgroundColor: "#007AFF",
    },
    buttonDisabled: {
        backgroundColor: "#9999",
    },
    buttonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "bold",
    },
});
