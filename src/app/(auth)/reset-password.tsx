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
    Linking,
    ActivityIndicator,
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

export default function ResetPasswordScreen() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // State untuk track apakah session dari deep link sudah di-set
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState(false);

    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(24))[0];

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);

    // ── Parse token dari deep link dan set Supabase session ──────────────────
    useEffect(() => {
        const handleDeepLink = async (url: string | null) => {
            if (!url) {
                setSessionError(true);
                return;
            }

            // URL format: taskly://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
            const fragment = url.split("#")[1];
            if (!fragment) {
                setSessionError(true);
                return;
            }

            const params = Object.fromEntries(
                fragment.split("&").map((pair) => {
                    const [key, ...rest] = pair.split("=");
                    return [decodeURIComponent(key), decodeURIComponent(rest.join("="))];
                })
            );

            const { access_token, refresh_token, type } = params;

            if (type !== "recovery" || !access_token || !refresh_token) {
                setSessionError(true);
                return;
            }

            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
                setSessionError(true);
                Alert.alert(
                    "Link Invalid",
                    "This reset link is invalid or has expired. Please request a new one.",
                    [{ text: "OK", onPress: () => router.replace("/(auth)/forgot-password") }]
                );
            } else {
                setSessionReady(true);
            }
        };

        // App dibuka dari cold start via deep link
        Linking.getInitialURL().then(handleDeepLink);

        // App sudah terbuka dan dapat deep link (e.g. di-foreground)
        const sub = Linking.addEventListener("url", (event) => handleDeepLink(event.url));
        return () => sub.remove();
    }, []);

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert("Error", "All fields must be filled.");
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            Alert.alert("Update Failed", error.message);
        } else {
            await supabase.auth.signOut();
            Alert.alert("Success! 🎉", "Your password has been updated. Please log in.", [
                { text: "Login Now", onPress: () => router.replace("/(auth)/login") }
            ]);
        }
    };

    return (
        <View style={styles.root}>
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

                        <View style={styles.headingBlock}>
                            <Text style={styles.headingMain}>
                                Reset password<Text style={styles.headingDot}>.</Text>
                            </Text>
                            <Text style={styles.headingSub}>Enter your new password below.</Text>
                        </View>

                        {/* ── Loading state saat verifikasi token ── */}
                        {!sessionReady && !sessionError && (
                            <View style={styles.stateBox}>
                                <ActivityIndicator size="small" color={C.primary} />
                                <Text style={styles.stateText}>Verifying reset link…</Text>
                            </View>
                        )}

                        {/* ── Error state (link expired/invalid) ── */}
                        {sessionError && (
                            <View style={[styles.stateBox, styles.stateBoxError]}>
                                <Ionicons name="warning-outline" size={20} color="#F87171" />
                                <Text style={[styles.stateText, styles.stateTextError]}>
                                    Link invalid or expired. Please request a new reset link.
                                </Text>
                                <TouchableOpacity
                                    style={styles.retryBtn}
                                    onPress={() => router.replace("/(auth)/forgot-password")}
                                >
                                    <Text style={styles.retryBtnText}>Request New Link</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ── Form (hanya tampil kalau session sudah siap) ── */}
                        {sessionReady && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Field
                                        label="New Password"
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
                                    <Field
                                        label="Confirm Password"
                                        placeholder="••••••••••"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        focused={focused === "cpw"}
                                        onFocus={() => setFocused("cpw")}
                                        onBlur={() => setFocused(null)}
                                        secureTextEntry={!showPassword}
                                        isPassword
                                        onTogglePassword={() => setShowPassword(!showPassword)}
                                        showPassword={showPassword}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.ctaBtn, loading && styles.ctaBtnLoading]}
                                    onPress={handleResetPassword}
                                    disabled={loading}
                                >
                                    <Text style={styles.ctaBtnText}>
                                        {loading ? "Updating…" : "Update Password"}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
                            <Text style={styles.backLink}>Cancel, back to Login</Text>
                        </TouchableOpacity>

                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function Field({
    label, placeholder, value, onChangeText,
    focused, onFocus, onBlur, secureTextEntry = false,
    isPassword = false,
    onTogglePassword,
    showPassword
}: any) {
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
        marginBottom: 12,
    },
    contentRow: { flexDirection: "row", alignItems: "center" },
    inputBlock: { flex: 1 },
    toggleBtn: { padding: 4, marginLeft: 8 },
    wrapFocused: { borderColor: C.primaryBorder, backgroundColor: C.primaryGlow },
    label: { fontSize: 10, fontWeight: "700", color: C.textSub, textTransform: "uppercase", marginBottom: 6 },
    labelFocused: { color: C.primaryText },
    input: { color: C.text, fontSize: 15, padding: 0 },
});

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    orbTopLeft: { position: "absolute", width: 300, height: 300, borderRadius: 150, top: -130, left: -110, backgroundColor: "rgba(61,255,160,0.04)" },
    orbBottomRight: { position: "absolute", width: 260, height: 260, borderRadius: 130, bottom: -90, right: -90, backgroundColor: "rgba(34,211,238,0.025)" },
    kav: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 26, paddingVertical: 48 },
    container: { width: "100%", maxWidth: 400, alignSelf: "center" },
    headingBlock: { marginBottom: 32 },
    headingMain: { color: C.text, fontSize: 32, fontWeight: "800", letterSpacing: -1, marginBottom: 8 },
    headingDot: { color: C.primary },
    headingSub: { color: C.textMid, fontSize: 14, lineHeight: 22 },
    inputGroup: { marginBottom: 24 },

    // Loading / Error state
    stateBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: C.surfaceHigh,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        marginBottom: 24,
        flexWrap: "wrap",
    },
    stateBoxError: {
        borderColor: "rgba(248,113,113,0.3)",
        backgroundColor: "rgba(248,113,113,0.06)",
    },
    stateText: { color: C.textSub, fontSize: 13, flex: 1 },
    stateTextError: { color: "#F87171" },
    retryBtn: {
        width: "100%",
        backgroundColor: "rgba(248,113,113,0.15)",
        borderRadius: 8,
        padding: 10,
        alignItems: "center",
        marginTop: 4,
    },
    retryBtnText: { color: "#F87171", fontSize: 13, fontWeight: "600" },

    ctaBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 17, alignItems: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
    ctaBtnLoading: { opacity: 0.6 },
    ctaBtnText: { color: "#041A0C", fontSize: 15, fontWeight: "700" },
    backLink: { textAlign: "center", marginTop: 24, color: C.textMid, fontSize: 13 },
});
