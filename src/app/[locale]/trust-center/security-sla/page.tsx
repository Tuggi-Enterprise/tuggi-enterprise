import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("securityTitle"),
    description: t("securityDescription"),
  };
}

export default async function SecuritySLAPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-tuggi-dark">
      <h1>Governança, Segurança e Disponibilidade</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-slate-400 !mb-8 border-b border-gray-100 pb-4">
        Compromisso de Confiança para Cidadãos, Governos e Empresas.
      </p>

      <p>
        A arquitetura do TUGGI foi desenhada para garantir que a narrativa cultural seja entregue com precisão, segurança e soberania. Operamos um modelo de governança híbrida que protege a integridade da informação em escala global e local.
      </p>

      <section>
        <h2>1. Soberania de Dados e Gestão de Zonas (Para B2G e B2B)</h2>
        <p>O TUGGI opera sob um modelo de &quot;Soberania Delegada&quot;. Isso garante que o controle da narrativa esteja sempre nas mãos certas:</p>
        <ul>
          <li><strong>Zonas Governamentais (City OS):</strong> Quando um município adquire o City OS, ele assume a &quot;Guarda da Narrativa&quot; sobre seu território. A prefeitura tem controle total e exclusivo para criar, editar e aprovar POIs e gatilhos dentro de sua jurisdição, garantindo a fidelidade histórica e institucional.</li>
          <li><strong>Zonas Corporativas (Enterprise/Frotas):</strong> Para locadoras e frotas, garantimos que as informações de suporte e rotas exclusivas sejam visíveis apenas para seus usuários, mantendo o isolamento total de dados e configurações de negócios.</li>
          <li><strong>Curadoria Global TUGGI:</strong> Em áreas onde não há uma gestão local ativa, a TUGGI mantém sua curadoria padrão via CMS, utilizando fontes verificadas e inteligência artificial para garantir que o turista nunca fique em silêncio.</li>
        </ul>
      </section>

      <section>
        <h2>2. Logs de Auditoria e Integridade (Segurança Institucional)</h2>
        <ul>
          <li><strong>Custódia da Informação:</strong> O TUGGI atua como o custodiante técnico da plataforma. Cada alteração em um gatilho de áudio, seja ela feita pela TUGGI ou por um parceiro governamental, é registrada em logs de auditoria imutáveis (RBAC), permitindo rastrear quem, quando e onde uma narrativa foi alterada.</li>
          <li><strong>Consistência de Dados:</strong> Garantimos que nenhuma informação de terceiros interfira nas zonas oficiais contratadas por cidades ou empresas.</li>
        </ul>
      </section>

      <section>
        <h2>3. Confiabilidade e Performance (Para o Usuário B2C)</h2>
        <p>Para o viajante na estrada, nossa promessa de SLA traduz-se em continuidade e segurança:</p>
        <ul>
          <li><strong>Disponibilidade Offline-First:</strong> Projetamos o TUGGI para não depender da nuvem no momento do disparo. Uma vez baixado o pacote de viagem, o acionamento do áudio é local e imediato, imune a falhas de conexão em áreas remotas.</li>
          <li><strong>Resiliência de Infraestrutura:</strong> Mantemos um SLA de 99,9% de disponibilidade em nossos serviços de autenticação e sincronização, garantindo que o seu passe de viagem esteja sempre ativo quando você precisar.</li>
          <li><strong>Segurança Hands-Free:</strong> Nosso compromisso número um é com a sua segurança física. O software é auditado para garantir que nenhuma interação visual seja necessária durante a condução, permitindo foco total na estrada.</li>
        </ul>
      </section>

      <section>
        <h2>4. Infraestrutura Global</h2>
        <p>
          Nossos dados são hospedados em centros de dados de classe mundial com criptografia AES-256 em repouso e TLS 1.3 em trânsito. Utilizamos o Supabase para gestão de identidade e Google Cloud para processamento de áudio, garantindo que o TUGGI utilize os mesmos padrões de segurança das maiores empresas de tecnologia do mundo.
        </p>
      </section>
    </article>
  );
}
