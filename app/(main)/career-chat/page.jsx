import { getCareerChatPageData } from "@/actions/chat";
import ChatbotUI from "@/components/chatbot/chatbot-ui";

export default async function CareerChatPage({ searchParams }) {
  const data = await getCareerChatPageData(searchParams);

  return (
    <div className="min-h-[calc(100dvh-10rem)] lg:h-full lg:min-h-0 lg:overflow-hidden">
      <ChatbotUI
        initialConversations={data.conversations}
        initialConversation={data.selectedConversation}
        initialMode={data.selectedMode}
        draftContext={data.draftContext}
        profileSummary={data.profileSummary}
        trackerSummary={data.trackerSummary}
        topSavedJobs={data.topSavedJobs}
        latestAssessment={data.latestAssessment}
      />
    </div>
  );
}
