"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useGuestAuth() {
  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();

        if (error) {
          console.error("Anonymous sign-in failed:", error.message);
          return;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      console.log("User:", userData.user);
    };

    init();
  }, []);
}