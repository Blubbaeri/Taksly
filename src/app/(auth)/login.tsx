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
    Alert,
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

export default function LoginScreen() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(24))[0];
    const logoScale = useState(new Animated.Value(0.92))[0];

    useEffect(() => {
        const checkLogin = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    router.replace("/(tabs)");
                    return;
                }
            } catch (e) {
                console.error(e);
            }
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
                Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
            ]).start();
        };
        checkLogin();
    }, []);

    const handleLogin = async () => {
        if (!identifier || !password) {
            Alert.alert("Error", "Email/Username and Password cannot be empty");
            return;
        }
        setLoading(true);
        let loginEmail = identifier;
        const isEmail = identifier.includes("@");

        if (!isEmail) {
            const { data: profileData, error: lookupError } = await supabase
                .from("user_profiles")
                .select("email")
                .eq("full_name", identifier)
                .single();
            if (lookupError || !profileData?.email) {
                setLoading(false);
                Alert.alert("Login Failed", "Username not found or not integrated yet.");
                return;
            }
            loginEmail = profileData.email;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        setLoading(false);

        if (error) {
            Alert.alert("Login Failed", error.message);
        } else {
            router.replace("/(tabs)");
        }
    };

    const handleBypassLogin = async () => {
        await supabase.auth.signOut();
        Alert.alert("Session Out", "Please try logging in again with a real account!");
    };

    const handleForgotPassword = () => {
        router.push("/(auth)/forgot-password");
    };

    return (
        <View style={styles.root}>
            {/* Glow orbs */}
            <View style={styles.orbTopLeft} />
            <View style={styles.orbBottomRight} />

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
                    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

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
                            <Text style={styles.headingWelcome}>Welcome back</Text>
                            <Text style={styles.headingMain}>
                                welcome<Text style={styles.headingDot}>.</Text>
                            </Text>
                            <Text style={styles.headingSub}>Sign in to continue your productivity.</Text>
                        </View>

                        {/* ── Inputs ── */}
                        <View style={styles.inputGroup}>
                            <Field
                                label="Email or Username"
                                placeholder="you@email.com"
                                value={identifier}
                                onChangeText={setIdentifier}
                                focused={focused === "id"}
                                onFocus={() => setFocused("id")}
                                onBlur={() => setFocused(null)}
                                autoCapitalize="none"
                            />
                            <View>
                                <Field
                                    label="Password"
                                    placeholder="••••••••••"
                                    value={password}
                                    onChangeText={setPassword}
                                    focused={focused === "pw"}
                                    onFocus={() => setFocused("pw")}
                                    onBlur={() => setFocused(null)}
                                    secureTextEntry={!showPassword}
                                    isPassword
                                    onTogglePassword={() => setShowPassword(!showPassword)}
                                    showPassword={showPassword}
                                />
                                <TouchableOpacity
                                    style={styles.forgotBtn}
                                    onPress={handleForgotPassword}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.forgotText}>Forgot password?</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ── Login CTA ── */}
                        <TouchableOpacity
                            style={[styles.ctaBtn, loading && styles.ctaBtnLoading]}
                            activeOpacity={0.88}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <Text style={styles.ctaBtnText}>
                                {loading ? "Signing in…" : "Sign In"}
                            </Text>
                            {!loading && <Text style={styles.ctaBtnArrow}>↗</Text>}
                        </TouchableOpacity>

                        {/* ── Register Link ── */}
                        <TouchableOpacity
                            style={styles.registerRow}
                            activeOpacity={0.7}
                            onPress={() => router.push("/(auth)/signup")}
                        >
                            <Text style={styles.registerText}>
                                Don't have an account?{"  "}
                                <Text style={styles.registerLink}>Register now</Text>
                            </Text>
                        </TouchableOpacity>

                        {/* ── Divider ── */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* ── Bypass ── */}
                        <TouchableOpacity style={styles.bypassBtn} onPress={handleBypassLogin} activeOpacity={0.7}>
                            <View style={styles.bypassDot} />
                            <Text style={styles.bypassText}>Test Mode · Bypass Login</Text>
                        </TouchableOpacity>

                        {/* ── Footer ── */}
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
    secureTextEntry?: boolean; autoCapitalize?: "none" | "sentences" | "words" | "characters";
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

    orbTopLeft: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
        top: -130,
        left: -110,
        backgroundColor: "rgba(61,255,160,0.04)",
    },
    orbBottomRight: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        bottom: -90,
        right: -90,
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
        marginBottom: 36,
    },
    headingWelcome: {
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

    // Register
    registerRow: {
        alignItems: "center",
        paddingVertical: 6,
        marginBottom: 28,
    },
    registerText: {
        color: C.textMid,
        fontSize: 13,
        fontWeight: "400",
    },
    registerLink: {
        color: C.primaryText,
        fontWeight: "600",
    },

    // Divider
    divider: {
        marginBottom: 20,
    },
    dividerLine: {
        height: 1,
        backgroundColor: C.borderSoft,
    },

    // Bypass
    bypassBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        marginBottom: 32,
    },
    bypassDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: C.textSub,
    },
    bypassText: {
        color: C.textSub,
        fontSize: 12,
        fontWeight: "500",
        letterSpacing: 0.3,
    },

    // Forgot
    forgotBtn: {
        alignSelf: "flex-end",
        marginTop: 8,
        paddingHorizontal: 4,
    },
    forgotText: {
        color: C.primaryText,
        fontSize: 12,
        fontWeight: "600",
    },

    // Footer
    footer: {
        textAlign: "center",
        color: C.muted,
        fontSize: 11,
        fontWeight: "500",
        letterSpacing: 0.5,
    },
});