import { NextResponse } from "next/server";

// Endpoint para webhook do formulário de exclusão
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { userId } = data;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Processar exclusão via Supabase com a API Key restrita, etc.
    // await supabase.rpc('delete_user_data', { user_id: userId })

    return NextResponse.json({ success: true, message: "Deletion request received" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
