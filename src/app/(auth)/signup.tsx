import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";

// ─── Theme ────────────────────────────────────────────────────────────────────

const C = {
    bg: "#08080E",
    surface: "#12121A",
    surfaceHigh: "#1C1C2E",
    border: "#2C2C3E",
    borderSoft: "#1C1C2E",
    primary: "#7C6FFF",
    primaryGlow: "rgba(124,111,255,0.08)",
    primaryBorder: "rgba(124,111,255,0.2)",
    primaryText: "#B8B2FF",
    text: "#FFFFFF",
    textSub: "#9494B0",
    textMid: "#5A5A78",
    muted: "#1E2336",
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SignupScreen() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(24))[0];
    const logoScale = useState(new Animated.Value(0.92))[0];

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleSignup = async () => {
        if (!email || !password || !username) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setLoading(true);

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            setLoading(false);
            Alert.alert("Registration Failed", authError.message);
            return;
        }

        const userId = authData.user?.id;

        if (!userId) {
            setLoading(false);
            Alert.alert("Error", "Failed to get user ID");
            return;
        }

        const { error: profileError } = await supabase
            .from("user_profiles")
            .insert([
                {
                    user_id: userId,
                    full_name: username,
                    email: email,
                    status: "active",
                    created_date: new Date().toISOString(),
                },
            ]);

        setLoading(false);

        if (profileError) {
            Alert.alert("Failed to Create Profile", profileError.message);
        } else {
            Alert.alert("Success", "Account successfully created. Please log in.", [
                { text: "OK", onPress: () => router.replace("/(auth)/login") },
            ]);
        }
    };

    return (
        <View style={styles.root}>
            {/* Glow orbs */}
            <View style={styles.orbTopRight} />
            <View style={styles.orbBottomLeft} />

            <KeyboardAvoidingView
                style={styles.kav}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={false}
                    bounces={false}
                >
                    <Animated.View
                        style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                    >
                        {/* ── Brand Mark ── */}
                        <Animated.View style={[styles.brandRow, { transform: [{ scale: logoScale }] }]}>
                            <View style={styles.logoMark}>
                                <Text style={styles.logoMarkText}>T</Text>
                                <View style={styles.logoMarkDot} />
                            </View>
                            <View>
                                <Text style={styles.brandName}>Taksly</Text>
                                <Text style={styles.brandTagline}>do your tasks</Text>
                            </View>
                        </Animated.View>

                        {/* ── Heading ── */}
                        <View style={styles.headingBlock}>
                            <Text style={styles.headingEye}>Start from here</Text>
                            <Text style={styles.headingMain}>
                                create account<Text style={styles.headingDot}>.</Text>
                            </Text>
                            <Text style={styles.headingSub}>
                                Organize your life, one task at a time.
                            </Text>
                        </View>

                        {/* ── Step indicator ── */}
                        <View style={styles.stepRow}>
                            <View style={styles.stepActive} />
                            <View style={styles.stepInactive} />
                            <View style={styles.stepInactive} />
                        </View>

                        {/* ── Inputs ── */}
                        <View style={styles.inputGroup}>
                            <Field
                                label="Username"
                                placeholder="your username"
                                value={username}
                                onChangeText={setUsername}
                                focused={focused === "username"}
                                onFocus={() => setFocused("username")}
                                onBlur={() => setFocused(null)}
                                autoCapitalize="none"
                            />
                            <Field
                                label="Email"
                                placeholder="you@email.com"
                                value={email}
                                onChangeText={setEmail}
                                focused={focused === "email"}
                                onFocus={() => setFocused("email")}
                                onBlur={() => setFocused(null)}
                                autoCapitalize="none"
                            />
                            <Field
                                label="Password"
                                placeholder="••••••••••"
                                value={password}
                                onChangeText={setPassword}
                                focused={focused === "password"}
                                onFocus={() => setFocused("password")}
                                onBlur={() => setFocused(null)}
                                secureTextEntry={!showPassword}
                                isPassword
                                onTogglePassword={() => setShowPassword(!showPassword)}
                                showPassword={showPassword}
                            />
                        </View>

                        {/* ── CTA ── */}
                        <TouchableOpacity
                            style={[styles.ctaBtn, loading && styles.ctaBtnLoading]}
                            activeOpacity={0.88}
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            <Text style={styles.ctaBtnText}>
                                {loading ? "Registering…" : "Create Account"}
                            </Text>
                            {!loading && <Text style={styles.ctaBtnArrow}>↗</Text>}
                        </TouchableOpacity>

                        {/* ── Login link ── */}
                        <TouchableOpacity
                            style={styles.loginRow}
                            activeOpacity={0.7}
                            onPress={() => router.replace("/(auth)/login")}
                        >
                            <Text style={styles.loginText}>
                                Already have an account?{"  "}
                                <Text style={styles.loginLink}>Log in</Text>
                            </Text>
                        </TouchableOpacity>

                        {/* ── Footer ── */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                        </View>
                        <Text style={styles.footer}>© 2026 Taksly</Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─── Field Component ──────────────────────────────────────────────────────────

function Field({
    label, placeholder, value, onChangeText,
    focused, onFocus, onBlur, secureTextEntry = false,
    autoCapitalize = "sentences",
    isPassword = false,
    onTogglePassword,
    showPassword
}: {
    label: string; placeholder: string; value: string;
    onChangeText: (t: string) => void; focused: boolean;
    onFocus: () => void; onBlur: () => void;
    secureTextEntry?: boolean;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    isPassword?: boolean;
    onTogglePassword?: () => void;
    showPassword?: boolean;
}) {
    return (
        <View style={[fieldStyles.wrap, focused && fieldStyles.wrapFocused]}>
            <View style={fieldStyles.contentRow}>
                <View style={fieldStyles.inputBlock}>
                    <Text style={[fieldStyles.label, focused && fieldStyles.labelFocused]}>{label}</Text>
                    <TextInput
                        style={fieldStyles.input}
                        placeholder={placeholder}
                        placeholderTextColor={C.textSub}
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        secureTextEntry={secureTextEntry}
                        autoCapitalize={autoCapitalize}
                    />
                </View>
                {isPassword && (
                    <TouchableOpacity onPress={onTogglePassword} style={fieldStyles.toggleBtn}>
                        <Ionicons 
                            name={showPassword ? "eye-off-outline" : "eye-outline"} 
                            size={20} 
                            color={focused ? C.primaryText : C.textMid} 
                        />
                    </TouchableOpacity>
                )}
            </View>
            {focused && <View style={fieldStyles.activeLine} />}
        </View>
    );
}

const fieldStyles = StyleSheet.create({
    wrap: {
        backgroundColor: C.surfaceHigh,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 12,
        position: "relative",
        overflow: "hidden",
    },
    contentRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    inputBlock: {
        flex: 1,
    },
    toggleBtn: {
        padding: 4,
        marginLeft: 8,
    },
    wrapFocused: {
        borderColor: C.primaryBorder,
        backgroundColor: C.primaryGlow,
    },
    label: {
        fontSize: 10,
        fontWeight: "700",
        color: C.textSub,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginBottom: 6,
    },
    labelFocused: {
        color: C.primaryText,
    },
    input: {
        color: C.text,
        fontSize: 15,
        fontWeight: "400",
        padding: 0,
        letterSpacing: 0.2,
    },
    activeLine: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 1.5,
        backgroundColor: C.primary,
    },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },

    orbTopRight: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
        top: -120,
        right: -110,
        backgroundColor: "rgba(61,255,160,0.04)",
    },
    orbBottomLeft: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        bottom: -90,
        left: -90,
        backgroundColor: "rgba(34,211,238,0.025)",
    },

    kav: { flex: 1 },
    scroll: {
        flexGrow: 1,
        justifyContent: "center",
        paddingVertical: 48,
        paddingHorizontal: 26,
    },

    container: {
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
    },

    // Brand
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 48,
    },
    logoMark: {
        width: 40,
        height: 40,
        borderRadius: 11,
        backgroundColor: C.primary,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    logoMarkText: {
        color: "#041A0C",
        fontWeight: "900",
        fontSize: 21,
        letterSpacing: -1,
    },
    logoMarkDot: {
        position: "absolute",
        bottom: 7,
        right: 7,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(0,0,0,0.25)",
    },
    brandName: {
        color: C.text,
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: -0.4,
    },
    brandTagline: {
        color: C.textSub,
        fontSize: 11,
        fontWeight: "500",
        letterSpacing: 0.3,
        marginTop: 1,
    },

    // Heading
    headingBlock: {
        marginBottom: 24,
    },
    headingEye: {
        color: C.textMid,
        fontSize: 14,
        fontWeight: "400",
        letterSpacing: 0.2,
        marginBottom: 2,
    },
    headingMain: {
        color: C.text,
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: -2,
        lineHeight: 48,
        marginBottom: 14,
    },
    headingDot: {
        color: C.primary,
    },
    headingSub: {
        color: C.textMid,
        fontSize: 14,
        lineHeight: 22,
        fontWeight: "400",
        letterSpacing: 0.1,
    },

    // Step indicator
    stepRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 28,
    },
    stepActive: {
        width: 24,
        height: 3,
        borderRadius: 2,
        backgroundColor: C.primary,
    },
    stepInactive: {
        width: 8,
        height: 3,
        borderRadius: 2,
        backgroundColor: C.border,
    },

    // Inputs
    inputGroup: {
        gap: 10,
        marginBottom: 20,
    },

    // CTA
    ctaBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: C.primary,
        borderRadius: 12,
        paddingVertical: 17,
        marginBottom: 16,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    ctaBtnLoading: { opacity: 0.6 },
    ctaBtnText: {
        color: "#041A0C",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.1,
    },
    ctaBtnArrow: {
        color: "#041A0C",
        fontSize: 16,
        fontWeight: "700",
        marginTop: -1,
    },

    // Login link
    loginRow: {
        alignItems: "center",
        paddingVertical: 6,
        marginBottom: 28,
    },
    loginText: {
        color: C.textMid,
        fontSize: 13,
        fontWeight: "400",
    },
    loginLink: {
        color: C.primaryText,
        fontWeight: "600",
    },

    // Divider + Footer
    divider: {
        marginBottom: 20,
    },
    dividerLine: {
        height: 1,
        backgroundColor: C.borderSoft,
    },
    footer: {
        textAlign: "center",
        color: C.muted,
        fontSize: 11,
        fontWeight: "500",
        letterSpacing: 0.5,
    },
});