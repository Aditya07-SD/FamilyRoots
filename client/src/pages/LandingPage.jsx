import { Link } from "react-router-dom";
import {
  ArrowRight,
  GitBranch,
  Images,
  Users,
  BookOpen,
  TreePine,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link to="/" className="landing-brand">
          <span className="landing-brand-icon">
            <TreePine size={22} />
          </span>

          <span>
            <strong>FamilyRoots</strong>
            <small>Our Family, Our Story</small>
          </span>
        </Link>

        <nav className="landing-nav">
          <Link to="/login" className="landing-login">
            Sign in
          </Link>

          <Link to="/register" className="landing-register">
            Create your family tree
            <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-content">
            <span className="landing-eyebrow">
              <TreePine size={15} />
              Your family. Your story. Your legacy.
            </span>

            <h1>
              Your family story
              <span> deserves to live forever.</span>
            </h1>

            <p>
              Build your family tree, preserve precious memories, and connect
              generations in one beautiful place.
            </p>

            <div className="landing-actions">
              <Link to="/register" className="landing-primary-button">
                Create Your Family Tree
                <ArrowRight size={18} />
              </Link>

              <Link to="/login" className="landing-secondary-button">
                Sign in
              </Link>
            </div>

            <div className="landing-trust">
              <span className="landing-avatar-stack">
                <span>F</span>
                <span>A</span>
                <span>R</span>
              </span>

              <span>
                Preserve the moments that connect generations.
              </span>
            </div>
          </div>

          <div className="landing-tree-art" aria-hidden="true">
            <div className="landing-tree-glow" />

            <div className="landing-tree">
              <div className="landing-tree-trunk" />

              <div className="landing-tree-branch branch-one" />
              <div className="landing-tree-branch branch-two" />
              <div className="landing-tree-branch branch-three" />

              <div className="landing-tree-node node-one">A</div>
              <div className="landing-tree-node node-two">M</div>
              <div className="landing-tree-node node-three">R</div>
              <div className="landing-tree-node node-four">S</div>
              <div className="landing-tree-node node-five">K</div>
            </div>
          </div>
        </section>

        <section className="landing-features">
          <div className="landing-section-heading">
            <span>Everything your family story needs</span>
            <h2>Build something worth passing down.</h2>
          </div>

          <div className="landing-feature-grid">
            <Feature
              icon={<GitBranch size={22} />}
              title="Build Your Family Tree"
              description="Map generations, relationships, and family connections in an elegant visual tree."
            />

            <Feature
              icon={<Users size={22} />}
              title="Connect Your Family"
              description="Invite relatives and build your family story together with shared access."
            />

            <Feature
              icon={<Images size={22} />}
              title="Preserve Memories"
              description="Keep meaningful photographs and memories connected to the people you love."
            />

            <Feature
              icon={<BookOpen size={22} />}
              title="Discover Your Story"
              description="Bring important moments, events, and generations together in one place."
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, description }) {
  return (
    <article className="landing-feature-card">
      <div className="landing-feature-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>
    </article>
  );
}