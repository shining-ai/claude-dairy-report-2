import { PrismaClient, Role, ReportStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.warn('シードデータの投入を開始します...');

  // パスワードのハッシュ化
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ユーザーの作成
  const yamada = await prisma.user.upsert({
    where: { email: 'yamada@example.com' },
    update: {},
    create: {
      name: '山田 太郎',
      email: 'yamada@example.com',
      passwordHash,
      role: Role.sales,
      department: '営業部',
    },
  });

  const suzuki = await prisma.user.upsert({
    where: { email: 'suzuki@example.com' },
    update: {},
    create: {
      name: '鈴木 次郎',
      email: 'suzuki@example.com',
      passwordHash,
      role: Role.sales,
      department: '営業部',
    },
  });

  const sato = await prisma.user.upsert({
    where: { email: 'sato@example.com' },
    update: {},
    create: {
      name: '佐藤 部長',
      email: 'sato@example.com',
      passwordHash,
      role: Role.manager,
      department: '営業部',
    },
  });

  console.warn(`ユーザー作成完了: ${yamada.name}, ${suzuki.name}, ${sato.name}`);

  // 顧客の作成
  const customerA = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      companyName: '株式会社A商事',
      contactName: '田中 一郎',
    },
  });

  const customerB = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      companyName: 'B株式会社',
      contactName: '中村 花子',
    },
  });

  const customerC = await prisma.customer.upsert({
    where: { id: 3 },
    update: {},
    create: {
      companyName: 'C工業株式会社',
      contactName: '小林 三郎',
    },
  });

  console.warn(
    `顧客作成完了: ${customerA.companyName}, ${customerB.companyName}, ${customerC.companyName}`,
  );

  // 山田太郎の日報作成（2026-03-20）
  const reportDate = new Date('2026-03-20');

  const report = await prisma.dailyReport.upsert({
    where: {
      userId_reportDate: {
        userId: yamada.id,
        reportDate,
      },
    },
    update: {},
    create: {
      userId: yamada.id,
      reportDate,
      problem: '新規開拓先へのアプローチ方法を検討する必要がある。競合他社との差別化が課題。',
      plan: '来週は製品デモを準備してA商事に再訪問する。B株式会社へは提案書を送付する予定。',
      status: ReportStatus.draft,
      visitRecords: {
        create: [
          {
            customerId: customerA.id,
            visitContent:
              '株式会社A商事の田中様と面談。新製品の紹介を行い、概ね好評を得た。次回デモを依頼された。',
            sortOrder: 1,
          },
          {
            customerId: customerB.id,
            visitContent:
              'B株式会社の中村様に電話でフォローアップ。提案書の送付を約束し、来月の商談を設定した。',
            sortOrder: 2,
          },
        ],
      },
    },
    include: {
      visitRecords: true,
    },
  });

  console.warn(`日報作成完了: reportId=${report.id}, date=${report.reportDate.toISOString()}`);
  console.warn(`訪問記録作成完了: ${report.visitRecords.length}件`);

  // 佐藤部長のコメント作成
  const comment = await prisma.comment.create({
    data: {
      reportId: report.id,
      userId: sato.id,
      commentText: 'A商事へのアプローチは良い進捗ですね。デモの準備をしっかり行ってください。期待しています。',
    },
  });

  console.warn(`コメント作成完了: commentId=${comment.id}`);
  console.warn('シードデータの投入が完了しました。');
}

main()
  .catch((e) => {
    console.error('シードデータの投入に失敗しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
