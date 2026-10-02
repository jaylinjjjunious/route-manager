import React from "react";
import ChangePasswordPanel from "./ChangePasswordPanel";
import { ToolPageHeader } from "../../components/aio/ToolPageHeader";

interface ChangePasswordPageProps {
  onBack: () => void;
}

export default function ChangePasswordPage({ onBack }: ChangePasswordPageProps) {
  return (
    <div className="animate-fade-in space-y-6" id="tab-view-changepassword">
      <ToolPageHeader
        onBack={onBack}
        title="Change Password"
        subtitle="Account Security"
      />
      <ChangePasswordPanel />
    </div>
  );
}