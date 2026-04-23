import { getCareerChatPageData } from "@/actions/chat";
import ChatbotUI from "@/components/chatbot/chatbot-ui";

export default async function CareerChatPage({ searchParams }) {
  const data = await getCareerChatPageData(searchParams);

  return (
    <div className="-mb-8 -mt-8 -mx-3 min-h-[calc(100dvh-4rem)] sm:mx-0 sm:mb-0 sm:mt-0 sm:min-h-[calc(100dvh-9rem)] xl:h-full xl:min-h-0 xl:overflow-hidden">
      <ChatbotUI
        initialConversations={data.conversations}
        initialConversation={data.selectedConversation}
        initialMode={data.selectedMode}
        draftContext={data.draftContext}
        savedJobs={data.savedJobs}
      />
    </div>
  );
}
