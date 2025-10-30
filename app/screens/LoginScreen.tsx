import React, { useState } from "react";
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ImageBackground
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from "../../constants/api";
import { useAuth } from "../../hooks/AuthProvider";

const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(true);


    const handleLogin = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/token/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login success:", data);
                await login({ access: data.access, refresh: data.refresh });
                Alert.alert("Login Success", "Welcome back!");
            } else {
                console.error("Login failed:", data);
                Alert.alert("Login Failed", data.detail || "Invalid credentials");
            }
        } catch (error) {
            console.error("Login error:", error);
            Alert.alert("Error", "An error occurred. Please try again.");
        }
        setLoading(false);
    };

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    return (
        <ImageBackground source={require('../../assets/images//Backgrounds/LoginBackground.webp')} style={styles.background} imageStyle={{ opacity: 0.7 }}>
            <View style={styles.overlay}>
                <Text style={styles.welcomeText}>Welcome to</Text>
                <Text style={styles.appName}>Serie A Excange</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        placeholderTextColor="#B0B0B0"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.inputPassword}
                            placeholder="Password"
                            placeholderTextColor="#B0B0B0"
                            secureTextEntry={isPasswordVisible}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={togglePasswordVisibility}>
                            <Ionicons
                                name={isPasswordVisible ? "eye-off" : "eye"}
                                size={24}
                                color="#00a028ff"
                            />
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color="#09650eff" />
                    ) : (
                        <>
                            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                                <Text style={styles.buttonText}>Login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.registerButton]} onPress={() => navigation.navigate('Register')}>
                                <Text style={styles.buttonText}>Register</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </ImageBackground>
    );
};

export default LoginScreen;

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
    welcomeText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '300',
        textAlign: 'center',
    },
    appName: {
        color: '#00a028ff',
        fontSize: 36,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    inputContainer: {
        width: '100%',
        marginTop: 20,
    },
    input: {
        height: 45,
        borderColor: '#09650eff',
        borderWidth: 1,
        marginBottom: 16,
        paddingLeft: 12,
        borderRadius: 10,
        backgroundColor: '#fff',
        color: '#333',
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 32,
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
    button: {
        backgroundColor: "#00a028ff",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginVertical: 5,
        width: '100%',
        marginBottom: 16,
    },
    buttonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    registerButton: {
        backgroundColor: '#09650eff',
    },
});
