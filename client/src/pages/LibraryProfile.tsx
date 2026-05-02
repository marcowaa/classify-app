import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ProfileHeader } from "@/components/ui/ProfileHeader";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getDateLocale } from "@/i18n/config";
import {
  Star, MessageSquare, BookOpen, Heart,
  Send, ShoppingBag, MapPin, Phone, Mail,
  Clock
} from "lucide-react";

export default function LibraryProfile() {
  const [, params] = useRoute("/library/:id");
  const libraryId = params?.id;
  const { toast } = useToast();
  const { t } = useTranslation();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [commentText, setCommentText] = useState("");
  const [activeCommentPost, setActiveCommentPost] = useState<number | null>(null);

  // Library info
  const { data: library, isLoading } = useQuery({
    queryKey: ["public-library", libraryId],
    queryFn: async () => {
      const res = await fetch(`/api/public/library/${libraryId}`);
      if (!res.ok) throw new Error("Not found");
      const json = await res.json();
      return json.data;
    },
    enabled: !!libraryId,
  });

  // Library posts
  const { data: postsData } = useQuery({
    queryKey: ["library-posts", libraryId],
    queryFn: async () => {
      const res = await fetch(`/api/public/library/${libraryId}/posts`);
      if (!res.ok) return { posts: [] };
      const json = await res.json();
      return json.data || { posts: [] };
    },
    enabled: !!libraryId,
  });

  // Library reviews
  const { data: reviewsData } = useQuery({
    queryKey: ["library-reviews", libraryId],
    queryFn: async () => {
      const res = await fetch(`/api/public/library/${libraryId}/reviews`);
      if (!res.ok) return { reviews: [], avgRating: "0" };
      const json = await res.json();
      return json.data || { reviews: [], avgRating: "0" };
    },
    enabled: !!libraryId,
  });

  // Library products
  const { data: productsData } = useQuery({
    queryKey: ["library-products", libraryId],
    queryFn: async () => {
      const res = await fetch(`/api/store/library/${libraryId}/products`);
      if (!res.ok) return { products: [] };
      const json = await res.json();
      return json.data || { products: [] };
    },
    enabled: !!libraryId,
  });

  // Like post
  const likePost = useMutation({
    mutationFn: async (postId: number) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/library/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(t("libraryProfile.failed"));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library-posts", libraryId] }),
  });

  // Comment on post
  const commentOnPost = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/library/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(t("libraryProfile.failed"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-posts", libraryId] });
      setCommentText("");
      setActiveCommentPost(null);
    },
  });

  // Submit review
  const submitReview = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/library/${libraryId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t("libraryProfile.submitReviewFailed"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-reviews", libraryId] });
      setReviewComment("");
      setReviewRating(5);
      toast({ title: t("libraryProfile.reviewSubmitted") });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!library) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t("libraryProfile.notFound")}</p>
      </div>
    );
  }

  const posts = postsData?.posts || [];
  const reviews = reviewsData?.reviews || [];
  const avgRating = reviewsData?.avgRating || "0";
  const products = productsData?.products || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 relative" dir="rtl">
      <div className="absolute top-4 ltr:right-4 rtl:left-4 z-50"><LanguageSelector /></div>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ProfileHeader
          name={library.name}
          bio={library.bio}
          avatarUrl={library.imageUrl}
          coverImageUrl={library.coverImageUrl}
          governorate={library.governorate}
          city={library.city}
          socialLinks={library.socialLinks}
          entityType="library"
          entityId={libraryId!}
          avgRating={avgRating}
          totalReviews={reviews.length}
          phoneNumber={library.phoneNumber}
          email={library.email}
        >
          {library.address && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{library.address}</span>
            </div>
          )}
        </ProfileHeader>

        <Tabs defaultValue="products" className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="products" className="gap-1">
              <ShoppingBag className="h-4 w-4" />
              {t("libraryProfile.products")} ({products.length})
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              {t("libraryProfile.posts")} ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1">
              <Star className="h-4 w-4" />
              {t("libraryProfile.reviews")} ({reviews.length})
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4 mt-4">
            {products.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("libraryProfile.noProducts")}</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map((product: any) => (
                  <Card key={product.id} className="overflow-hidden">
                    {product.imageUrl && (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover" />
                    )}
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm line-clamp-2">{product.name}</h4>
                      {product.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-green-600">{product.price} {t("libraryProfile.currency")}</span>
                        {product.pointsPrice > 0 && (
                          <Badge variant="secondary" className="text-xs">{product.pointsPrice} {t("libraryProfile.points")}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4 mt-4">
            {posts.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("libraryProfile.noPosts")}</CardContent></Card>
            ) : (
              posts.map((post: any) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{library.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString(getDateLocale())}
                        </p>
                      </div>
                      {post.isPinned && (
                        <Badge variant="outline" className="mr-auto text-xs">{t("libraryProfile.pinned")}</Badge>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{post.content}</p>
                    {post.mediaUrls?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {post.mediaUrls.map((url: string, i: number) => (
                          <img key={i} src={url} alt="" className="h-48 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
                      <button
                        onClick={() => likePost.mutate(post.id)}
                        className="flex items-center gap-1 hover:text-red-500 transition-colors"
                      >
                        <Heart className="h-4 w-4" />
                        {post.likesCount || 0}
                      </button>
                      <button
                        onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                        className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {post.commentsCount || 0}
                      </button>
                    </div>
                    {activeCommentPost === post.id && (
                      <div className="mt-3 flex gap-2">
                        <Textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={t("libraryProfile.writeComment")}
                          className="flex-1 min-h-[60px]"
                        />
                        <Button
                          size="sm"
                          onClick={() => commentOnPost.mutate({ postId: post.id, content: commentText })}
                          disabled={!commentText.trim() || commentOnPost.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4 mt-4">
            {/* Average Rating Card */}
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-yellow-500">{parseFloat(avgRating).toFixed(1)}</div>
                <div className="text-yellow-400 text-2xl my-1">
                  {"★".repeat(Math.round(parseFloat(avgRating)))}
                  {"☆".repeat(5 - Math.round(parseFloat(avgRating)))}
                </div>
                <p className="text-sm text-muted-foreground">{reviews.length} {t("libraryProfile.reviewCount")}</p>
              </CardContent>
            </Card>

            {/* Submit Review Form */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">{t("libraryProfile.addYourReview")}</h3>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl transition-colors ${star <= reviewRating ? "text-yellow-400" : "text-gray-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t("libraryProfile.writeReviewOptional")}
                  className="mb-3"
                />
                <Button
                  onClick={() => submitReview.mutate()}
                  disabled={submitReview.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {t("libraryProfile.submitReview")}
                </Button>
              </CardContent>
            </Card>

            {reviews.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t("libraryProfile.noReviewsYet")}</CardContent></Card>
            ) : (
              reviews.map((review: any) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400">{"★".repeat(review.rating)}</span>
                      <span className="text-gray-300">{"★".repeat(5 - review.rating)}</span>
                      <span className="text-sm text-muted-foreground mr-2">
                        {review.parentName || t("libraryProfile.user")}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(review.createdAt).toLocaleDateString(getDateLocale())}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
