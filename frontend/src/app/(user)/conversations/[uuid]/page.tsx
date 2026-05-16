"use client";

import { useParams } from "next/navigation";
import { ConversationView } from "@/components/user/conversation/ConversationView";

export default function ConversationPage() {
  const params = useParams();
  const uuid = params.uuid as string;

  return <ConversationView conversationUuid={uuid} />;
}
