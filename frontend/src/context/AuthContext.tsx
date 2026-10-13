import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "../services/api";

/* ============================================================
   USER ROLE
============================================================ */

export type UserRole = "ADMIN" | "FARMER";


/* ============================================================
   AUTH USER
============================================================ */

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  farmerId: number | null;
  isActive: boolean;
}


/* ============================================================
   AUTH CONTEXT TYPE
============================================================ */

interface AuthContextType {
  user: AuthUser | null;

  loading: boolean;

  isAuthenticated: boolean;

  login: (
    username: string,
    password: string
  ) => Promise<{
    success: boolean;
    message?: string;
  }>;

  logout: () => Promise<void>;

  refreshUser: () => Promise<void>;
}


/* ============================================================
   CONTEXT
============================================================ */

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);


/* ============================================================
   PROVIDER PROPS
============================================================ */

interface AuthProviderProps {
  children: ReactNode;
}


/* ============================================================
   AUTH PROVIDER
============================================================ */

export function AuthProvider({
  children,
}: AuthProviderProps) {

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] =
    useState(true);


  /* ==========================================================
     GET CURRENT USER
  ========================================================== */

  const refreshUser = async () => {

    try {

      const response =
        await api.get("/auth/me");

      const data = response.data;

      if (
        data?.status === "success" &&
        data?.authenticated === true &&
        data?.user
      ) {

        setUser(data.user);

      } else {

        setUser(null);
      }

    } catch (error) {

      /*
       * 401 here simply means there is currently
       * no authenticated session.
       */

      setUser(null);

      console.error(
        "Failed to check authentication:",
        error
      );
    }
  };


  /* ==========================================================
     CHECK SESSION WHEN APP STARTS
  ========================================================== */

  useEffect(() => {

    const checkAuthentication =
      async () => {

        setLoading(true);

        try {

          await refreshUser();

        } finally {

          setLoading(false);
        }
      };


    checkAuthentication();

  }, []);


  /* ==========================================================
     LOGIN
  ========================================================== */

  const login = async (
    username: string,
    password: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> => {

    try {

      const response =
        await api.post(
          "/auth/login",
          {
            username,
            password,
          }
        );

      const data =
        response.data;


      if (
        data?.status === "success" &&
        data?.user
      ) {

        /*
         * Flask session cookie is automatically stored
         * because api.ts uses withCredentials: true.
         */

        setUser(data.user);

        return {
          success: true,
          message:
            data.message ||
            "Login successful.",
        };
      }


      return {
        success: false,
        message:
          data?.message ||
          "Login failed.",
      };

    } catch (error: any) {

      console.error(
        "Login error:",
        error
      );


      const message =
        error?.response?.data?.message ||
        "Unable to connect to the AgriLedger backend. Make sure Flask is running.";


      return {
        success: false,
        message,
      };
    }
  };


  /* ==========================================================
     LOGOUT
  ========================================================== */

  const logout = async () => {

    try {

      await api.post(
        "/auth/logout"
      );

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    } finally {

      setUser(null);
    }
  };


  /* ==========================================================
     CONTEXT VALUE
  ========================================================== */

  const value: AuthContextType = {

    user,

    loading,

    isAuthenticated:
      user !== null,

    login,

    logout,

    refreshUser,
  };


  /* ==========================================================
     PROVIDER
  ========================================================== */

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}


/* ============================================================
   USE AUTH
============================================================ */

export function useAuth(): AuthContextType {

  const context =
    useContext(AuthContext);


  if (!context) {

    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }


  return context;
}


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default AuthContext;