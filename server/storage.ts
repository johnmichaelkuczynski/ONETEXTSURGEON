import { 
  type User, 
  type InsertUser, 
  type StylometricAuthor, 
  type InsertStylometricAuthor,
  type AnalysisHistory,
  type InsertAnalysisHistory,
  type CorpusAuthor,
  type InsertCorpusAuthor,
  type CorpusWork,
  type InsertCorpusWork,
  type WorkSection,
  type InsertWorkSection,
  type PhilosophicalPosition,
  type InsertPhilosophicalPosition,
  type Visit,
  type BookDatabaseRow,
  type InsertBookDatabase,
  users, 
  stylometricAuthors,
  analysisHistory,
  corpusAuthors,
  corpusWorks,
  workSections,
  philosophicalPositions,
  visits,
  bookDatabases,
} from "@shared/schema";
import { db, hasDatabase } from "./db";
import { eq, and, desc, ilike, or, sql, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  addCredits(userId: number, amount: number): Promise<User>;
  deductCredits(userId: number, amount: number): Promise<User>;
  getUserCredits(userId: number): Promise<number>;
  
  getStylometricAuthors(userId: number): Promise<StylometricAuthor[]>;
  getStylometricAuthor(id: number): Promise<StylometricAuthor | undefined>;
  getStylometricAuthorByName(userId: number, authorName: string): Promise<StylometricAuthor | undefined>;
  createStylometricAuthor(author: InsertStylometricAuthor): Promise<StylometricAuthor>;
  updateStylometricAuthor(id: number, author: Partial<InsertStylometricAuthor>): Promise<StylometricAuthor | undefined>;
  deleteStylometricAuthor(id: number): Promise<boolean>;
  
  createAnalysisHistory(history: InsertAnalysisHistory): Promise<AnalysisHistory>;
  getAnalysisHistory(userId: number): Promise<AnalysisHistory[]>;
  getAnalysisHistoryByType(userId: number, analysisType: string): Promise<AnalysisHistory[]>;
  getAnalysisHistoryItem(id: number): Promise<AnalysisHistory | undefined>;
  deleteAnalysisHistoryItem(id: number): Promise<boolean>;
  
  // Corpus management
  getAllCorpusAuthors(): Promise<CorpusAuthor[]>;
  getCorpusAuthor(id: number): Promise<CorpusAuthor | undefined>;
  findCorpusAuthorByName(name: string): Promise<CorpusAuthor | undefined>;
  createCorpusAuthor(author: InsertCorpusAuthor): Promise<CorpusAuthor>;
  deleteCorpusAuthor(id: number): Promise<boolean>;
  
  getCorpusWorks(authorId: number): Promise<CorpusWork[]>;
  getCorpusWork(id: number): Promise<CorpusWork | undefined>;
  createCorpusWork(work: InsertCorpusWork): Promise<CorpusWork>;
  deleteCorpusWork(id: number): Promise<boolean>;
  
  getWorkSections(workId: number): Promise<WorkSection[]>;
  createWorkSections(sections: InsertWorkSection[]): Promise<WorkSection[]>;
  searchCorpusByAuthor(authorName: string, searchTerm: string): Promise<{ section: WorkSection; workTitle: string; authorName: string }[]>;
  
  // Philosophical positions for RAG
  getAllPhilosophicalPositions(): Promise<PhilosophicalPosition[]>;
  getPhilosophicalPositionsByTopic(topic: string): Promise<PhilosophicalPosition[]>;
  getPhilosophicalPositionsByThinker(thinker: string): Promise<PhilosophicalPosition[]>;
  searchPhilosophicalPositions(searchTerm: string): Promise<PhilosophicalPosition[]>;
  createPhilosophicalPosition(position: InsertPhilosophicalPosition): Promise<PhilosophicalPosition>;
  batchCreatePhilosophicalPositions(positions: InsertPhilosophicalPosition[]): Promise<PhilosophicalPosition[]>;
  deletePhilosophicalPosition(id: number): Promise<boolean>;

  // Visit tracking
  recordVisit(userId: number | null, email: string | null): Promise<void>;
  getLastVisit(userId: number): Promise<Visit | undefined>;
  getVisits(limit: number): Promise<Visit[]>;
  getVisitTimestampsSince(since: Date | null): Promise<Date[]>;

  // Book Database 2.0
  saveBookDatabase(entry: InsertBookDatabase): Promise<BookDatabaseRow>;
  getBookDatabases(userId: number): Promise<BookDatabaseRow[]>;
  getBookDatabase(id: number): Promise<BookDatabaseRow | undefined>;
  deleteBookDatabase(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async addCredits(userId: number, amount: number): Promise<User> {
    const [user] = await db.update(users)
      .set({ credits: sql`${users.credits} + ${amount}` })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deductCredits(userId: number, amount: number): Promise<User> {
    const [user] = await db.update(users)
      .set({ credits: sql`GREATEST(${users.credits} - ${amount}, 0)` })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserCredits(userId: number): Promise<number> {
    const user = await this.getUserById(userId);
    return user?.credits ?? 0;
  }
  
  async getStylometricAuthors(userId: number): Promise<StylometricAuthor[]> {
    return await db.select().from(stylometricAuthors).where(eq(stylometricAuthors.userId, userId));
  }
  
  async getStylometricAuthor(id: number): Promise<StylometricAuthor | undefined> {
    const [author] = await db.select().from(stylometricAuthors).where(eq(stylometricAuthors.id, id));
    return author;
  }
  
  async getStylometricAuthorByName(userId: number, authorName: string): Promise<StylometricAuthor | undefined> {
    const [author] = await db.select().from(stylometricAuthors).where(
      and(
        eq(stylometricAuthors.userId, userId),
        eq(stylometricAuthors.authorName, authorName)
      )
    );
    return author;
  }
  
  async createStylometricAuthor(author: InsertStylometricAuthor): Promise<StylometricAuthor> {
    const [created] = await db.insert(stylometricAuthors).values(author).returning();
    return created;
  }
  
  async updateStylometricAuthor(id: number, author: Partial<InsertStylometricAuthor>): Promise<StylometricAuthor | undefined> {
    const [updated] = await db.update(stylometricAuthors)
      .set({ ...author, updatedAt: new Date() })
      .where(eq(stylometricAuthors.id, id))
      .returning();
    return updated;
  }
  
  async deleteStylometricAuthor(id: number): Promise<boolean> {
    const result = await db.delete(stylometricAuthors).where(eq(stylometricAuthors.id, id));
    return true;
  }
  
  async createAnalysisHistory(history: InsertAnalysisHistory): Promise<AnalysisHistory> {
    const [created] = await db.insert(analysisHistory).values(history).returning();
    return created;
  }
  
  async getAnalysisHistory(userId: number): Promise<AnalysisHistory[]> {
    return await db.select()
      .from(analysisHistory)
      .where(eq(analysisHistory.userId, userId))
      .orderBy(desc(analysisHistory.createdAt));
  }
  
  async getAnalysisHistoryByType(userId: number, analysisType: string): Promise<AnalysisHistory[]> {
    return await db.select()
      .from(analysisHistory)
      .where(and(
        eq(analysisHistory.userId, userId),
        eq(analysisHistory.analysisType, analysisType)
      ))
      .orderBy(desc(analysisHistory.createdAt));
  }
  
  async getAnalysisHistoryItem(id: number): Promise<AnalysisHistory | undefined> {
    const [item] = await db.select().from(analysisHistory).where(eq(analysisHistory.id, id));
    return item;
  }
  
  async deleteAnalysisHistoryItem(id: number): Promise<boolean> {
    await db.delete(analysisHistory).where(eq(analysisHistory.id, id));
    return true;
  }
  
  // Corpus management implementations
  async getAllCorpusAuthors(): Promise<CorpusAuthor[]> {
    return await db.select().from(corpusAuthors).orderBy(corpusAuthors.name);
  }
  
  async getCorpusAuthor(id: number): Promise<CorpusAuthor | undefined> {
    const [author] = await db.select().from(corpusAuthors).where(eq(corpusAuthors.id, id));
    return author;
  }
  
  async findCorpusAuthorByName(name: string): Promise<CorpusAuthor | undefined> {
    // Search by name or aliases (case-insensitive)
    const [author] = await db.select().from(corpusAuthors).where(
      or(
        ilike(corpusAuthors.name, `%${name}%`),
        ilike(corpusAuthors.aliases, `%${name}%`)
      )
    );
    return author;
  }
  
  async createCorpusAuthor(author: InsertCorpusAuthor): Promise<CorpusAuthor> {
    const [created] = await db.insert(corpusAuthors).values(author).returning();
    return created;
  }
  
  async deleteCorpusAuthor(id: number): Promise<boolean> {
    // First delete all work sections for this author's works
    const works = await db.select().from(corpusWorks).where(eq(corpusWorks.authorId, id));
    for (const work of works) {
      await db.delete(workSections).where(eq(workSections.workId, work.id));
    }
    // Delete works
    await db.delete(corpusWorks).where(eq(corpusWorks.authorId, id));
    // Delete author
    await db.delete(corpusAuthors).where(eq(corpusAuthors.id, id));
    return true;
  }
  
  async getCorpusWorks(authorId: number): Promise<CorpusWork[]> {
    return await db.select().from(corpusWorks).where(eq(corpusWorks.authorId, authorId)).orderBy(corpusWorks.title);
  }
  
  async getCorpusWork(id: number): Promise<CorpusWork | undefined> {
    const [work] = await db.select().from(corpusWorks).where(eq(corpusWorks.id, id));
    return work;
  }
  
  async createCorpusWork(work: InsertCorpusWork): Promise<CorpusWork> {
    const [created] = await db.insert(corpusWorks).values(work).returning();
    return created;
  }
  
  async deleteCorpusWork(id: number): Promise<boolean> {
    // Delete sections first
    await db.delete(workSections).where(eq(workSections.workId, id));
    // Delete work
    await db.delete(corpusWorks).where(eq(corpusWorks.id, id));
    return true;
  }
  
  async getWorkSections(workId: number): Promise<WorkSection[]> {
    return await db.select().from(workSections).where(eq(workSections.workId, workId)).orderBy(workSections.sectionNumber);
  }
  
  async createWorkSections(sections: InsertWorkSection[]): Promise<WorkSection[]> {
    if (sections.length === 0) return [];
    const created = await db.insert(workSections).values(sections).returning();
    return created;
  }
  
  async searchCorpusByAuthor(authorName: string, searchTerm: string): Promise<{ section: WorkSection; workTitle: string; authorName: string }[]> {
    // Find the author
    const author = await this.findCorpusAuthorByName(authorName);
    if (!author) return [];
    
    // Get all works by this author
    const works = await this.getCorpusWorks(author.id);
    if (works.length === 0) return [];
    
    const results: { section: WorkSection; workTitle: string; authorName: string }[] = [];
    
    // Search through sections of all works
    for (const work of works) {
      const sections = await db.select()
        .from(workSections)
        .where(
          and(
            eq(workSections.workId, work.id),
            ilike(workSections.content, `%${searchTerm}%`)
          )
        );
      
      for (const section of sections) {
        results.push({
          section,
          workTitle: work.title,
          authorName: author.name
        });
      }
    }
    
    return results;
  }
  
  // Philosophical positions for RAG
  async getAllPhilosophicalPositions(): Promise<PhilosophicalPosition[]> {
    return await db.select().from(philosophicalPositions).orderBy(desc(philosophicalPositions.createdAt));
  }
  
  async getPhilosophicalPositionsByTopic(topic: string): Promise<PhilosophicalPosition[]> {
    return await db.select().from(philosophicalPositions)
      .where(ilike(philosophicalPositions.topic, `%${topic}%`))
      .orderBy(desc(philosophicalPositions.createdAt));
  }
  
  async getPhilosophicalPositionsByThinker(thinker: string): Promise<PhilosophicalPosition[]> {
    return await db.select().from(philosophicalPositions)
      .where(ilike(philosophicalPositions.thinker, `%${thinker}%`))
      .orderBy(desc(philosophicalPositions.createdAt));
  }
  
  async searchPhilosophicalPositions(searchTerm: string): Promise<PhilosophicalPosition[]> {
    return await db.select().from(philosophicalPositions)
      .where(
        or(
          ilike(philosophicalPositions.statement, `%${searchTerm}%`),
          ilike(philosophicalPositions.topic, `%${searchTerm}%`),
          ilike(philosophicalPositions.thinker, `%${searchTerm}%`),
          ilike(philosophicalPositions.keywords, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(philosophicalPositions.createdAt));
  }
  
  async createPhilosophicalPosition(position: InsertPhilosophicalPosition): Promise<PhilosophicalPosition> {
    const [created] = await db.insert(philosophicalPositions).values(position).returning();
    return created;
  }
  
  async batchCreatePhilosophicalPositions(positions: InsertPhilosophicalPosition[]): Promise<PhilosophicalPosition[]> {
    if (positions.length === 0) return [];
    const created = await db.insert(philosophicalPositions).values(positions).returning();
    return created;
  }
  
  async deletePhilosophicalPosition(id: number): Promise<boolean> {
    const result = await db.delete(philosophicalPositions).where(eq(philosophicalPositions.id, id)).returning();
    return result.length > 0;
  }

  // Visit tracking
  async recordVisit(userId: number | null, email: string | null): Promise<void> {
    await db.insert(visits).values({ userId, email });
  }

  async getLastVisit(userId: number): Promise<Visit | undefined> {
    const [visit] = await db.select().from(visits)
      .where(eq(visits.userId, userId))
      .orderBy(desc(visits.visitedAt))
      .limit(1);
    return visit;
  }

  async getVisits(limit: number): Promise<Visit[]> {
    return await db.select().from(visits)
      .orderBy(desc(visits.visitedAt))
      .limit(limit);
  }

  async getVisitTimestampsSince(since: Date | null): Promise<Date[]> {
    const rows = since
      ? await db.select({ visitedAt: visits.visitedAt }).from(visits).where(gte(visits.visitedAt, since))
      : await db.select({ visitedAt: visits.visitedAt }).from(visits);
    return rows.map((r) => r.visitedAt);
  }

  // ── Book Database 2.0 ────────────────────────────────────────────────────

  async saveBookDatabase(entry: InsertBookDatabase): Promise<BookDatabaseRow> {
    const [row] = await db.insert(bookDatabases).values(entry).returning();
    return row;
  }

  async getBookDatabases(userId: number): Promise<BookDatabaseRow[]> {
    return db.select().from(bookDatabases)
      .where(eq(bookDatabases.userId, userId))
      .orderBy(desc(bookDatabases.createdAt));
  }

  async getBookDatabase(id: number): Promise<BookDatabaseRow | undefined> {
    const [row] = await db.select().from(bookDatabases).where(eq(bookDatabases.id, id));
    return row;
  }

  async deleteBookDatabase(id: number): Promise<boolean> {
    const result = await db.delete(bookDatabases).where(eq(bookDatabases.id, id));
    return true;
  }
}

class MemStorage implements IStorage {
  private users: User[] = [];
  private stylometricAuthors: StylometricAuthor[] = [];
  private analysisHistory: AnalysisHistory[] = [];
  private corpusAuthors: CorpusAuthor[] = [];
  private corpusWorks: CorpusWork[] = [];
  private workSections: WorkSection[] = [];
  private philosophicalPositions: PhilosophicalPosition[] = [];
  private visits: Visit[] = [];
  private bookDatabases: BookDatabaseRow[] = [];
  private ids = {
    users: 1,
    stylometricAuthors: 1,
    analysisHistory: 1,
    corpusAuthors: 1,
    corpusWorks: 1,
    workSections: 1,
    philosophicalPositions: 1,
    visits: 1,
    bookDatabases: 1,
  };

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const created = {
      id: this.ids.users++,
      username: user.username,
      googleId: user.googleId ?? null,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      credits: user.credits ?? 0,
      createdAt: new Date(),
    } satisfies User;
    this.users.push(created);
    return created;
  }

  async addCredits(userId: number, amount: number): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    user.credits += amount;
    return user;
  }

  async deductCredits(userId: number, amount: number): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    user.credits = Math.max(user.credits - amount, 0);
    return user;
  }

  async getUserCredits(userId: number): Promise<number> {
    return (await this.getUserById(userId))?.credits ?? 0;
  }

  async getStylometricAuthors(userId: number): Promise<StylometricAuthor[]> {
    return this.stylometricAuthors.filter((author) => author.userId === userId);
  }

  async getStylometricAuthor(id: number): Promise<StylometricAuthor | undefined> {
    return this.stylometricAuthors.find((author) => author.id === id);
  }

  async getStylometricAuthorByName(userId: number, authorName: string): Promise<StylometricAuthor | undefined> {
    return this.stylometricAuthors.find(
      (author) => author.userId === userId && author.authorName.toLowerCase() === authorName.toLowerCase(),
    );
  }

  async createStylometricAuthor(author: InsertStylometricAuthor): Promise<StylometricAuthor> {
    const now = new Date();
    const created = {
      id: this.ids.stylometricAuthors++,
      userId: author.userId ?? null,
      authorName: author.authorName,
      sourceTitle: author.sourceTitle ?? null,
      wordCount: author.wordCount ?? null,
      verticalityScore: author.verticalityScore ?? null,
      createdAt: now,
      updatedAt: now,
      rawFeatures: author.rawFeatures ?? null,
      signaturePhrases: author.signaturePhrases ?? null,
      negativeMarkers: author.negativeMarkers ?? null,
      sampleSentences: author.sampleSentences ?? null,
      closestAuthorMatch: author.closestAuthorMatch ?? null,
      matchExplanation: author.matchExplanation ?? null,
      psychologicalProfile: author.psychologicalProfile ?? null,
      narrativeSummary: author.narrativeSummary ?? null,
      clustering: author.clustering ?? null,
      fullReport: author.fullReport ?? null,
    } satisfies StylometricAuthor;
    this.stylometricAuthors.push(created);
    return created;
  }

  async updateStylometricAuthor(id: number, author: Partial<InsertStylometricAuthor>): Promise<StylometricAuthor | undefined> {
    const existing = await this.getStylometricAuthor(id);
    if (!existing) return undefined;
    Object.assign(existing, author, { updatedAt: new Date() });
    return existing;
  }

  async deleteStylometricAuthor(id: number): Promise<boolean> {
    const before = this.stylometricAuthors.length;
    this.stylometricAuthors = this.stylometricAuthors.filter((author) => author.id !== id);
    return this.stylometricAuthors.length !== before;
  }

  async createAnalysisHistory(history: InsertAnalysisHistory): Promise<AnalysisHistory> {
    const created = {
      id: this.ids.analysisHistory++,
      userId: history.userId ?? null,
      analysisType: history.analysisType,
      provider: history.provider ?? null,
      inputPreview: history.inputPreview ?? null,
      outputData: history.outputData ?? null,
      createdAt: new Date(),
    } satisfies AnalysisHistory;
    this.analysisHistory.push(created);
    return created;
  }

  async getAnalysisHistory(userId: number): Promise<AnalysisHistory[]> {
    return this.analysisHistory
      .filter((history) => history.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getAnalysisHistoryByType(userId: number, analysisType: string): Promise<AnalysisHistory[]> {
    return (await this.getAnalysisHistory(userId)).filter((history) => history.analysisType === analysisType);
  }

  async getAnalysisHistoryItem(id: number): Promise<AnalysisHistory | undefined> {
    return this.analysisHistory.find((history) => history.id === id);
  }

  async deleteAnalysisHistoryItem(id: number): Promise<boolean> {
    const before = this.analysisHistory.length;
    this.analysisHistory = this.analysisHistory.filter((history) => history.id !== id);
    return this.analysisHistory.length !== before;
  }

  async getAllCorpusAuthors(): Promise<CorpusAuthor[]> {
    return [...this.corpusAuthors].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCorpusAuthor(id: number): Promise<CorpusAuthor | undefined> {
    return this.corpusAuthors.find((author) => author.id === id);
  }

  async findCorpusAuthorByName(name: string): Promise<CorpusAuthor | undefined> {
    const needle = name.toLowerCase();
    return this.corpusAuthors.find((author) =>
      author.name.toLowerCase().includes(needle) ||
      (author.aliases ?? "").toLowerCase().includes(needle),
    );
  }

  async createCorpusAuthor(author: InsertCorpusAuthor): Promise<CorpusAuthor> {
    const created = {
      id: this.ids.corpusAuthors++,
      name: author.name,
      aliases: author.aliases ?? null,
      era: author.era ?? null,
      description: author.description ?? null,
      createdAt: new Date(),
    } satisfies CorpusAuthor;
    this.corpusAuthors.push(created);
    return created;
  }

  async deleteCorpusAuthor(id: number): Promise<boolean> {
    const workIds = this.corpusWorks.filter((work) => work.authorId === id).map((work) => work.id);
    this.workSections = this.workSections.filter((section) => !workIds.includes(section.workId ?? -1));
    this.corpusWorks = this.corpusWorks.filter((work) => work.authorId !== id);
    const before = this.corpusAuthors.length;
    this.corpusAuthors = this.corpusAuthors.filter((author) => author.id !== id);
    return this.corpusAuthors.length !== before;
  }

  async getCorpusWorks(authorId: number): Promise<CorpusWork[]> {
    return this.corpusWorks
      .filter((work) => work.authorId === authorId)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async getCorpusWork(id: number): Promise<CorpusWork | undefined> {
    return this.corpusWorks.find((work) => work.id === id);
  }

  async createCorpusWork(work: InsertCorpusWork): Promise<CorpusWork> {
    const created = {
      id: this.ids.corpusWorks++,
      authorId: work.authorId ?? null,
      title: work.title,
      year: work.year ?? null,
      source: work.source ?? null,
      wordCount: work.wordCount ?? null,
      createdAt: new Date(),
    } satisfies CorpusWork;
    this.corpusWorks.push(created);
    return created;
  }

  async deleteCorpusWork(id: number): Promise<boolean> {
    this.workSections = this.workSections.filter((section) => section.workId !== id);
    const before = this.corpusWorks.length;
    this.corpusWorks = this.corpusWorks.filter((work) => work.id !== id);
    return this.corpusWorks.length !== before;
  }

  async getWorkSections(workId: number): Promise<WorkSection[]> {
    return this.workSections
      .filter((section) => section.workId === workId)
      .sort((a, b) => a.sectionNumber - b.sectionNumber);
  }

  async createWorkSections(sections: InsertWorkSection[]): Promise<WorkSection[]> {
    const created = sections.map((section) => ({
      id: this.ids.workSections++,
      workId: section.workId ?? null,
      sectionNumber: section.sectionNumber,
      content: section.content,
      createdAt: new Date(),
    }) satisfies WorkSection);
    this.workSections.push(...created);
    return created;
  }

  async searchCorpusByAuthor(authorName: string, searchTerm: string): Promise<{ section: WorkSection; workTitle: string; authorName: string }[]> {
    const author = await this.findCorpusAuthorByName(authorName);
    if (!author) return [];
    const needle = searchTerm.toLowerCase();
    const works = await this.getCorpusWorks(author.id);
    return works.flatMap((work) =>
      this.workSections
        .filter((section) => section.workId === work.id && section.content.toLowerCase().includes(needle))
        .map((section) => ({ section, workTitle: work.title, authorName: author.name })),
    );
  }

  async getAllPhilosophicalPositions(): Promise<PhilosophicalPosition[]> {
    return [...this.philosophicalPositions].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getPhilosophicalPositionsByTopic(topic: string): Promise<PhilosophicalPosition[]> {
    const needle = topic.toLowerCase();
    return (await this.getAllPhilosophicalPositions()).filter((position) => position.topic.toLowerCase().includes(needle));
  }

  async getPhilosophicalPositionsByThinker(thinker: string): Promise<PhilosophicalPosition[]> {
    const needle = thinker.toLowerCase();
    return (await this.getAllPhilosophicalPositions()).filter((position) => position.thinker.toLowerCase().includes(needle));
  }

  async searchPhilosophicalPositions(searchTerm: string): Promise<PhilosophicalPosition[]> {
    const needle = searchTerm.toLowerCase();
    return (await this.getAllPhilosophicalPositions()).filter((position) =>
      position.statement.toLowerCase().includes(needle) ||
      position.topic.toLowerCase().includes(needle) ||
      position.thinker.toLowerCase().includes(needle) ||
      (position.keywords ?? "").toLowerCase().includes(needle),
    );
  }

  async createPhilosophicalPosition(position: InsertPhilosophicalPosition): Promise<PhilosophicalPosition> {
    const created = {
      id: this.ids.philosophicalPositions++,
      thinker: position.thinker,
      statement: position.statement,
      topic: position.topic,
      source: position.source ?? null,
      era: position.era ?? null,
      keywords: position.keywords ?? null,
      embedding: position.embedding ?? null,
      createdAt: new Date(),
    } satisfies PhilosophicalPosition;
    this.philosophicalPositions.push(created);
    return created;
  }

  async batchCreatePhilosophicalPositions(positions: InsertPhilosophicalPosition[]): Promise<PhilosophicalPosition[]> {
    const created: PhilosophicalPosition[] = [];
    for (const position of positions) created.push(await this.createPhilosophicalPosition(position));
    return created;
  }

  async deletePhilosophicalPosition(id: number): Promise<boolean> {
    const before = this.philosophicalPositions.length;
    this.philosophicalPositions = this.philosophicalPositions.filter((position) => position.id !== id);
    return this.philosophicalPositions.length !== before;
  }

  async recordVisit(userId: number | null, email: string | null): Promise<void> {
    this.visits.push({
      id: this.ids.visits++,
      userId,
      email,
      visitedAt: new Date(),
    });
  }

  async getLastVisit(userId: number): Promise<Visit | undefined> {
    return this.visits
      .filter((visit) => visit.userId === userId)
      .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime())[0];
  }

  async getVisits(limit: number): Promise<Visit[]> {
    return [...this.visits]
      .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime())
      .slice(0, limit);
  }

  async getVisitTimestampsSince(since: Date | null): Promise<Date[]> {
    return this.visits
      .filter((visit) => !since || visit.visitedAt >= since)
      .map((visit) => visit.visitedAt);
  }

  async saveBookDatabase(entry: InsertBookDatabase): Promise<BookDatabaseRow> {
    const created = {
      id: this.ids.bookDatabases++,
      userId: entry.userId ?? null,
      title: entry.title ?? null,
      author: entry.author ?? null,
      wordCount: entry.wordCount ?? null,
      provider: entry.provider ?? null,
      inputPreview: entry.inputPreview ?? null,
      data: entry.data,
      createdAt: new Date(),
    } satisfies BookDatabaseRow;
    this.bookDatabases.push(created);
    return created;
  }

  async getBookDatabases(userId: number): Promise<BookDatabaseRow[]> {
    return this.bookDatabases
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getBookDatabase(id: number): Promise<BookDatabaseRow | undefined> {
    return this.bookDatabases.find((entry) => entry.id === id);
  }

  async deleteBookDatabase(id: number): Promise<boolean> {
    const before = this.bookDatabases.length;
    this.bookDatabases = this.bookDatabases.filter((entry) => entry.id !== id);
    return this.bookDatabases.length !== before;
  }
}

export const storage = hasDatabase ? new DatabaseStorage() : new MemStorage();
